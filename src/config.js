const productionBaseUrl = 'https://www.martin-matuska.com/';

const link = (path) => new URL(path.replace(/^\//, ''), productionBaseUrl).href;

const moduleStaticBaseUrl = import.meta.env.DEV
  ? new URL(/* @vite-ignore */ '/', import.meta.url).href
  : new URL(/* @vite-ignore */ '../', import.meta.url).href;
const configuredStaticBaseUrl = '';
const staticBaseUrl = new URL(configuredStaticBaseUrl || moduleStaticBaseUrl).href;
const allowedStaticOrigins = Object.freeze([new URL(staticBaseUrl).origin]);

export const APP_CONFIG = Object.freeze({
  productionBaseUrl,
  staticData: Object.freeze({
    baseUrl: staticBaseUrl,
    allowedOrigins: allowedStaticOrigins,
    activeDrawManifestPath: 'draw-config.json',
    releaseManifestPath: 'release-manifest.json',
    requestTimeoutMs: 5_000,
    retryScheduleMs: Object.freeze([0, 250, 750]),
  }),
  release: Object.freeze({
    version: '1.0.3',
    publicationStatus: 'public-committed',
    publicationLabel: 'Verejne zverejnené',
    sourceUrl: 'https://github.com/martinbmatuska-cmd/STERON-transparent-draw',
    sourceVersion: 'STERON transparentné žrebovanie v1.0.3 — verejný release',
  }),
  links: Object.freeze({
    home: link('/'),
    project: link('/s-projects-side-by-side'),
    shop: link('/blank'),
    vip: link('/vip'),
    support: link('/pricing-plans/list'),
  }),
  media: Object.freeze({
    desktop: Object.freeze({
      image: new URL('assets/hero-desktop-poster.webp', staticBaseUrl).href,
      videoWebm: new URL('assets/hero-desktop.webm', staticBaseUrl).href,
      videoMp4: new URL('assets/hero-desktop.mp4', staticBaseUrl).href,
    }),
    mobile: Object.freeze({
      image: new URL('assets/mobile-bg.webp', staticBaseUrl).href,
      videoWebm: '',
      videoMp4: '',
    }),
  }),
  branding: Object.freeze({
    eyeImage: new URL('assets/steron-eye-source.jpg', staticBaseUrl).href,
  }),
  drawLocks: Object.freeze({
    'steron-2026-09': Object.freeze({
      id: 'steron-2026-09',
      protocol: 'STERON-DRAW-v1',
      drawTimeUtc: '2026-09-18T16:30:00.000Z',
      entriesSha256: '48e458a0033c67ed19d0c0dc2ef79aa2d1db47db4a0ba21d0dc0e4d40a174185',
      chainHash: '52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971',
      publicKey: '83cf0f2896adee7eb8b5f01fcad3912212c437e0073e911fb90022d3e760183c8c4b450b6a0a6c3ac6a5776a2d1064510d1fec758c921cc22b0e17e63aaf4bcb5ed66304de9cf809bd274ca73bab4af5a6e9c76a4bc09e76eae8991ef5ece45a',
      groupHash: 'f477d5c89f21a17c863a7f937c6a6d15859414d2be09cd448d4279af331c5d3e',
      targetRound: 32315212,
    }),
  }),
});

export function assertAllowedStaticUrl(relativeOrAbsoluteUrl, baseUrl = APP_CONFIG.staticData.baseUrl, errorCode = 'STATIC_ORIGIN') {
  const resolved = new URL(relativeOrAbsoluteUrl, baseUrl);
  if (!APP_CONFIG.staticData.allowedOrigins.includes(resolved.origin)) {
    const error = new Error('Statický súbor smeruje mimo povoleného originu.');
    error.code = errorCode;
    throw error;
  }
  return resolved;
}

export function resolveStaticUrl(relativeUrl) {
  return assertAllowedStaticUrl(relativeUrl).href;
}
