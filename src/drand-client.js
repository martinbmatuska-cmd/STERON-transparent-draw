import { fetchBeacon } from 'drand-client';

export class DrandUnavailableError extends Error {
  constructor(message, attempts = []) {
    super(message);
    this.name = 'DrandUnavailableError';
    this.code = 'DRAND_UNAVAILABLE';
    this.attempts = attempts;
  }
}

export class DrandVerificationError extends Error {
  constructor(message, cause) {
    super(message, cause ? { cause } : undefined);
    this.name = 'DrandVerificationError';
    this.code = 'DRAND_VERIFICATION_FAILED';
  }
}

class RelayRequestError extends Error {
  constructor(message, cause) {
    super(message, cause ? { cause } : undefined);
    this.name = 'RelayRequestError';
    this.code = 'DRAND_RELAY_REQUEST_FAILED';
  }
}

function exact(value, expected, label) {
  if (value !== expected) throw new DrandVerificationError(`Drand ${label} sa nezhoduje s uzamknutou konfiguráciou.`);
}

function assertChainInfo(info, drand) {
  if (!info || typeof info !== 'object') throw new DrandVerificationError('Drand /info nevrátil platný objekt.');
  exact(info.hash, drand.chainHash, 'chain hash');
  exact(info.public_key, drand.publicKey, 'verejný kľúč');
  exact(info.groupHash, drand.groupHash, 'group hash');
  exact(info.schemeID, drand.schemeId, 'podpisová schéma');
  exact(info.period, drand.periodSeconds, 'perióda');
  exact(info.genesis_time, drand.genesisTimeUnix, 'genesis čas');
  exact(info.metadata?.beaconID, 'quicknet', 'beacon ID');
  return info;
}

function assertBeaconShape(beacon, expectedRound) {
  if (!beacon || typeof beacon !== 'object') throw new DrandVerificationError('Drand round nevrátil platný objekt.');
  exact(beacon.round, expectedRound, 'round');
  if (typeof beacon.randomness !== 'string' || !/^[0-9a-f]{64}$/.test(beacon.randomness)) {
    throw new DrandVerificationError('Drand randomness nemá očakávaný 32-bajtový lowercase hex formát.');
  }
  if (typeof beacon.signature !== 'string' || !/^[0-9a-f]{96}$/.test(beacon.signature)) {
    throw new DrandVerificationError('Drand podpis nemá očakávaný 48-bajtový lowercase hex formát.');
  }
  if ('previous_signature' in beacon) {
    throw new DrandVerificationError('Quicknet je unchained sieť; previous_signature sa neočakáva.');
  }
  return beacon;
}

async function requestJson(url, timeoutMs, fetchImpl, outerSignal) {
  const controller = new AbortController();
  const abortRequest = () => controller.abort();
  outerSignal?.addEventListener('abort', abortRequest, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) throw new RelayRequestError(`Relay vrátil HTTP ${response.status}.`);
    try {
      return await response.json();
    } catch (error) {
      throw new DrandVerificationError('Relay vrátil neplatné JSON.', error);
    }
  } catch (error) {
    if (error instanceof DrandVerificationError || error instanceof RelayRequestError) throw error;
    if (error?.name === 'AbortError') throw new RelayRequestError('Relay neodpovedal v časovom limite.', error);
    throw new RelayRequestError('Relay sa nepodarilo kontaktovať.', error);
  } finally {
    clearTimeout(timer);
    outerSignal?.removeEventListener('abort', abortRequest);
  }
}

class LockedChain {
  constructor(baseUrl, drand, timeoutMs, fetchImpl, signal) {
    this.baseUrl = baseUrl;
    this.drand = drand;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
    this.signal = signal;
    this.cachedInfo = null;
  }

  async info() {
    if (!this.cachedInfo) {
      const info = await requestJson(`${this.baseUrl}/info`, this.timeoutMs, this.fetchImpl, this.signal);
      this.cachedInfo = assertChainInfo(info, this.drand);
    }
    return this.cachedInfo;
  }
}

class LockedClient {
  constructor(chain, drand, timeoutMs, fetchImpl, signal) {
    this.someChain = chain;
    this.drand = drand;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
    this.signal = signal;
    this.options = {
      disableBeaconVerification: false,
      noCache: false,
      chainVerificationParams: {
        chainHash: drand.chainHash,
        publicKey: drand.publicKey,
      },
    };
  }

  chain() {
    return this.someChain;
  }

  async get(roundNumber) {
    const beacon = await requestJson(`${this.someChain.baseUrl}/public/${roundNumber}`, this.timeoutMs, this.fetchImpl, this.signal);
    return assertBeaconShape(beacon, roundNumber);
  }

  async latest() {
    throw new DrandVerificationError('Latest round je v tomto projekte zámerne zakázaný.');
  }
}

async function fetchFromRelay(relayBaseUrl, config, fetchImpl, signal) {
  const baseUrl = `${relayBaseUrl.replace(/\/$/, '')}/${config.drand.chainHash}`;
  const chain = new LockedChain(baseUrl, config.drand, config.drand.requestTimeoutMs, fetchImpl, signal);
  const client = new LockedClient(chain, config.drand, config.drand.requestTimeoutMs, fetchImpl, signal);
  try {
    await chain.info();
    const beacon = await fetchBeacon(client, config.drand.targetRound);
    assertBeaconShape(beacon, config.drand.targetRound);
    return {
      ...beacon,
      relay: relayBaseUrl,
      verification: 'valid',
      verifiedAtUtc: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof RelayRequestError || error instanceof DrandVerificationError) throw error;
    throw new DrandVerificationError('Kryptografické overenie drand beaconu zlyhalo.', error);
  }
}

export async function fetchVerifiedBeacon(config, { fetchImpl = fetch, signal } = {}) {
  const attempts = [];
  let sawIntegrityFailure = false;
  for (const relay of config.drand.relayBaseUrls) {
    try {
      return await fetchFromRelay(relay, config, fetchImpl, signal);
    } catch (error) {
      attempts.push({ relay, code: error.code || 'DRAND_ERROR', message: error.message });
      if (error instanceof DrandVerificationError) sawIntegrityFailure = true;
    }
  }
  if (sawIntegrityFailure) {
    throw new DrandVerificationError('Žiadny oficiálny relay neposkytol beacon, ktorý prešiel úplným overením.');
  }
  throw new DrandUnavailableError('Vopred určený drand round zatiaľ nie je dostupný.', attempts);
}

export async function verifyBeaconPayload({ beacon, chainInfo, expectedRound }) {
  const info = { ...chainInfo };
  const staticChain = { baseUrl: 'memory://quicknet', info: async () => info };
  const staticClient = {
    options: { disableBeaconVerification: false, noCache: false },
    chain: () => staticChain,
    get: async (round) => assertBeaconShape({ ...beacon }, round),
    latest: async () => { throw new Error('latest is disabled'); },
  };
  try {
    return await fetchBeacon(staticClient, expectedRound);
  } catch (error) {
    throw new DrandVerificationError('Kryptografické overenie drand beaconu zlyhalo.', error);
  }
}
