const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

export const PROTOCOL = 'STERON-DRAW-v1';
export const UINT32_RANGE = 0x1_0000_0000;
export const OFFICIAL_DRAND_RELAYS = Object.freeze([
  'https://api.drand.sh',
  'https://api2.drand.sh',
  'https://api3.drand.sh',
  'https://drand.cloudflare.com',
]);

export class DrawIntegrityError extends Error {
  constructor(message, code = 'DRAW_INTEGRITY_ERROR') {
    super(message);
    this.name = 'DrawIntegrityError';
    this.code = code;
  }
}

function invariant(condition, message, code) {
  if (!condition) throw new DrawIntegrityError(message, code);
}

export function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex, expectedBytes) {
  invariant(typeof hex === 'string' && /^[0-9a-f]+$/.test(hex) && hex.length % 2 === 0,
    'Hexadecimálna hodnota nemá kanonický lowercase formát.', 'INVALID_HEX');
  if (expectedBytes !== undefined) {
    invariant(hex.length === expectedBytes * 2,
      `Hexadecimálna hodnota musí mať ${expectedBytes} bajtov.`, 'INVALID_HEX_LENGTH');
  }
  return Uint8Array.from(hex.match(/.{2}/g), (pair) => Number.parseInt(pair, 16));
}

export async function sha256Bytes(input) {
  const bytes = typeof input === 'string' ? encoder.encode(input) : input;
  invariant(bytes instanceof Uint8Array, 'SHA-256 vstup musí byť text alebo Uint8Array.', 'INVALID_HASH_INPUT');
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return new Uint8Array(digest);
}

export async function sha256Hex(input) {
  return bytesToHex(await sha256Bytes(input));
}

export function parseCanonicalEntries(input) {
  const bytes = typeof input === 'string' ? encoder.encode(input) : input;
  invariant(bytes instanceof Uint8Array, 'Zoznam vstupov nie je v podporovanom formáte.', 'INVALID_ENTRIES_TYPE');
  invariant(!(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf),
    'entries.txt nesmie obsahovať UTF-8 BOM.', 'ENTRIES_BOM');

  let text;
  try {
    text = decoder.decode(bytes);
  } catch {
    throw new DrawIntegrityError('entries.txt nie je platný UTF-8.', 'ENTRIES_ENCODING');
  }

  invariant(!text.includes('\r'), 'entries.txt musí používať iba LF, nie CRLF.', 'ENTRIES_LINE_ENDING');
  invariant(text.endsWith('\n'), 'entries.txt musí končiť presne jedným LF.', 'ENTRIES_TRAILING_NEWLINE');
  invariant(!text.endsWith('\n\n'), 'entries.txt nesmie obsahovať prázdny posledný riadok navyše.', 'ENTRIES_EXTRA_NEWLINE');

  const lines = text.slice(0, -1).split('\n');
  invariant(lines.every((line) => line.length > 0), 'entries.txt obsahuje prázdny riadok.', 'ENTRIES_EMPTY_LINE');
  invariant(lines.every((line) => /^ST-(0[1-9]|1[0-9]|2[0-4])$/.test(line)),
    'entries.txt obsahuje neplatný verejný kód.', 'ENTRIES_CODE_FORMAT');
  invariant(new Set(lines).size === lines.length, 'entries.txt obsahuje duplicitný kód.', 'ENTRIES_DUPLICATE');

  const roundTrip = encoder.encode(text);
  invariant(roundTrip.length === bytes.length && roundTrip.every((byte, index) => byte === bytes[index]),
    'entries.txt nie je kanonicky zakódovaný v UTF-8.', 'ENTRIES_NOT_CANONICAL');
  return { entries: lines, text, bytes };
}

function isIsoUtc(value) {
  if (typeof value !== 'string' || !value.endsWith('Z')) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}

export function roundTimestampMs(genesisTimeUnix, periodSeconds, round) {
  return (genesisTimeUnix + ((round - 1) * periodSeconds)) * 1000;
}

export function validateDrawConfig(config, lock) {
  invariant(config && typeof config === 'object', 'Konfigurácia žrebovania chýba.', 'CONFIG_MISSING');
  invariant(config.schemaVersion === 1, 'Nepodporovaná verzia konfigurácie.', 'CONFIG_SCHEMA');
  invariant(config.protocol === PROTOCOL, 'Nepodporovaný protokol žrebovania.', 'CONFIG_PROTOCOL');
  invariant(typeof config.id === 'string' && /^[a-z0-9-]+$/.test(config.id), 'Neplatné ID žrebovania.', 'CONFIG_ID');
  invariant(config.status === 'active' || config.status === 'archived', 'Neplatný stav žrebovania.', 'CONFIG_STATUS');
  invariant(isIsoUtc(config.drawTimeUtc) && isIsoUtc(config.roundTimeUtc), 'Čas žrebovania musí byť absolútny UTC ISO timestamp.', 'CONFIG_TIME');

  const { entries, drand } = config;
  invariant(entries && drand, 'Konfigurácia vstupov alebo drand chýba.', 'CONFIG_SECTIONS');
  invariant(entries.count === 24, 'Toto žrebovanie musí mať presne 24 vstupov.', 'CONFIG_ENTRY_COUNT');
  hexToBytes(entries.sha256, 32);
  invariant(entries.canonical?.encoding === 'UTF-8' && entries.canonical?.lineEnding === 'LF' && entries.canonical?.trailingNewline === true,
    'Kanonický formát entries.txt nesedí.', 'CONFIG_CANONICAL_FORMAT');
  invariant(entries.canonical?.linePattern === '^ST-(0[1-9]|1[0-9]|2[0-4])$',
    'Vzor verejných kódov nesedí.', 'CONFIG_ENTRY_PATTERN');
  invariant(typeof entries.url === 'string' && entries.url.endsWith('entries.txt'), 'Neplatná cesta k entries.txt.', 'CONFIG_ENTRIES_URL');

  invariant(drand.network === 'League of Entropy mainnet Quicknet', 'Nesprávna drand sieť.', 'CONFIG_DRAND_NETWORK');
  hexToBytes(drand.chainHash, 32);
  hexToBytes(drand.publicKey, 96);
  hexToBytes(drand.groupHash, 32);
  invariant(drand.schemeId === 'bls-unchained-g1-rfc9380', 'Nesprávna podpisová schéma drand.', 'CONFIG_DRAND_SCHEME');
  invariant(drand.periodSeconds === 3, 'Quicknet musí mať periódu 3 sekundy.', 'CONFIG_DRAND_PERIOD');
  invariant(Number.isSafeInteger(drand.genesisTimeUnix) && drand.genesisTimeUnix > 0, 'Neplatný genesis čas drand.', 'CONFIG_DRAND_GENESIS');
  invariant(Number.isSafeInteger(drand.targetRound) && drand.targetRound > 0, 'Neplatný cieľový round drand.', 'CONFIG_DRAND_ROUND');
  invariant(Array.isArray(drand.relayBaseUrls) && drand.relayBaseUrls.length >= 2, 'Musia byť nastavené aspoň dva drand relaye.', 'CONFIG_DRAND_RELAYS');
  invariant(new Set(drand.relayBaseUrls).size === drand.relayBaseUrls.length && drand.relayBaseUrls.every((url) => /^https:\/\/[a-z0-9.-]+$/i.test(url)),
    'Zoznam drand relayov je neplatný.', 'CONFIG_DRAND_RELAYS');
  invariant(drand.relayBaseUrls.every((url) => OFFICIAL_DRAND_RELAYS.includes(url)),
    'Konfigurácia obsahuje nepovolený drand relay.', 'CONFIG_DRAND_RELAY_NOT_ALLOWED');
  invariant(Number.isInteger(drand.requestTimeoutMs) && drand.requestTimeoutMs >= 1000 && drand.requestTimeoutMs <= 15000,
    'Timeout drand požiadavky je mimo bezpečného rozsahu.', 'CONFIG_DRAND_TIMEOUT');
  invariant(Array.isArray(drand.retryScheduleMs) && drand.retryScheduleMs.length > 0 && drand.retryScheduleMs.every((value) => Number.isInteger(value) && value >= 250 && value <= 60000),
    'Retry harmonogram drand je neplatný.', 'CONFIG_DRAND_RETRY');

  const expectedRoundTime = roundTimestampMs(drand.genesisTimeUnix, drand.periodSeconds, drand.targetRound);
  invariant(expectedRoundTime === Date.parse(config.roundTimeUtc), 'Round timestamp nesedí s genesis časom, periódou a roundom.', 'CONFIG_ROUND_TIME_MISMATCH');
  invariant(Date.parse(config.drawTimeUtc) === Date.parse(config.roundTimeUtc), 'Čas žrebovania musí byť totožný s časom cieľového roundu.', 'CONFIG_DRAW_TIME_MISMATCH');

  invariant(lock && typeof lock === 'object', 'Pre aktívne žrebovanie chýba lokálny záväzok.', 'CONFIG_LOCK_MISSING');
  const lockedFields = {
    id: config.id,
    protocol: config.protocol,
    drawTimeUtc: config.drawTimeUtc,
    entriesSha256: entries.sha256,
    chainHash: drand.chainHash,
    publicKey: drand.publicKey,
    groupHash: drand.groupHash,
    targetRound: drand.targetRound,
  };
  for (const [key, value] of Object.entries(lockedFields)) {
    invariant(lock[key] === value, `Konfigurácia sa nezhoduje s lokálnym záväzkom (${key}).`, 'CONFIG_LOCK_MISMATCH');
  }
  return config;
}

export async function verifyEntries(bytes, config) {
  const parsed = parseCanonicalEntries(bytes);
  invariant(parsed.entries.length === config.entries.count, 'Počet vstupov nesedí s konfiguráciou.', 'ENTRIES_COUNT_MISMATCH');
  const hash = await sha256Hex(parsed.bytes);
  invariant(hash === config.entries.sha256, 'SHA-256 hash entries.txt nesedí s uzamknutou konfiguráciou.', 'ENTRIES_HASH_MISMATCH');
  return { ...parsed, hash };
}

export function buildSeedMaterial({ entriesHashHex, chainHash, round, randomnessHex }) {
  hexToBytes(entriesHashHex, 32);
  hexToBytes(chainHash, 32);
  hexToBytes(randomnessHex, 32);
  invariant(Number.isSafeInteger(round) && round > 0, 'Round pre seed je neplatný.', 'SEED_ROUND');
  return `${PROTOCOL}\n${entriesHashHex}\n${chainHash}\n${round}\n${randomnessHex}`;
}

function uint64be(value) {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(value), false);
  return bytes;
}

function concatBytes(...parts) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

export class Sha256ByteStream {
  constructor(seedBytes) {
    invariant(seedBytes instanceof Uint8Array && seedBytes.length === 32, 'Byte stream vyžaduje 32-bajtový seed.', 'STREAM_SEED');
    this.seedBytes = seedBytes;
    this.counter = 0n;
    this.buffer = new Uint8Array(0);
    this.offset = 0;
  }

  async refill() {
    this.buffer = await sha256Bytes(concatBytes(this.seedBytes, uint64be(this.counter)));
    this.counter += 1n;
    this.offset = 0;
  }

  async nextUint32() {
    if (this.offset + 4 > this.buffer.length) await this.refill();
    const value = new DataView(this.buffer.buffer, this.buffer.byteOffset + this.offset, 4).getUint32(0, false);
    this.offset += 4;
    return value;
  }
}

export async function sampleUniformUint32(bound, nextUint32) {
  invariant(Number.isInteger(bound) && bound >= 1 && bound <= UINT32_RANGE, 'Rejection sampling bound je neplatný.', 'SAMPLING_BOUND');
  invariant(typeof nextUint32 === 'function', 'Chýba zdroj deterministického byte streamu.', 'SAMPLING_SOURCE');
  const limit = Math.floor(UINT32_RANGE / bound) * bound;
  for (;;) {
    const value = await nextUint32();
    invariant(Number.isInteger(value) && value >= 0 && value < UINT32_RANGE, 'Byte stream vrátil neplatné uint32.', 'SAMPLING_VALUE');
    if (value < limit) return value % bound;
  }
}

export async function deterministicPermutation(entries, finalSeedBytes) {
  invariant(Array.isArray(entries) && entries.length > 0 && new Set(entries).size === entries.length,
    'Fisher–Yates vyžaduje neprázdny zoznam jedinečných vstupov.', 'PERMUTATION_ENTRIES');
  const output = [...entries];
  const stream = new Sha256ByteStream(finalSeedBytes);
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = await sampleUniformUint32(index + 1, () => stream.nextUint32());
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
}

export async function computeDraw({ entries, entriesHashHex, config, drandRandomnessHex }) {
  invariant(entries.length === config.entries.count, 'Výpočet dostal nesprávny počet vstupov.', 'DRAW_ENTRY_COUNT');
  const seedMaterial = buildSeedMaterial({
    entriesHashHex,
    chainHash: config.drand.chainHash,
    round: config.drand.targetRound,
    randomnessHex: drandRandomnessHex,
  });
  const finalSeedBytes = await sha256Bytes(seedMaterial);
  const finalSeedHex = bytesToHex(finalSeedBytes);
  const order = await deterministicPermutation(entries, finalSeedBytes);
  invariant(order.length === entries.length && new Set(order).size === entries.length && order.every((entry) => entries.includes(entry)),
    'Výsledné poradie nie je platná permutácia vstupov.', 'DRAW_PERMUTATION');
  return {
    seedMaterial,
    finalSeedHex,
    order,
    winner: order[0],
    firstAlternate: order[1],
  };
}

export function getCountdownState(nowMs, targetMs) {
  invariant(Number.isFinite(nowMs) && Number.isFinite(targetMs), 'Countdown vyžaduje platné timestampy.', 'COUNTDOWN_TIME');
  const remainingMs = targetMs - nowMs;
  if (remainingMs <= 0) return { phase: 'due', remainingMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  let totalSeconds = Math.ceil(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  totalSeconds %= 86400;
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return { phase: 'countdown', remainingMs, days, hours, minutes, seconds };
}
