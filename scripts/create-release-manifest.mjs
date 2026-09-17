import { createHash } from 'node:crypto';
import { access, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const candidateFiles = [
  'index.html',
  'entries.txt',
  'draw-config.json',
  'draws/steron-2026-09.json',
  'src/config.js',
  'src/draw-engine.js',
  'src/drand-client.js',
  'src/steron-draw.js',
  'src/styles.css',
  'assets/desktop-bg.webp',
  'assets/hero-desktop.mp4',
  'assets/hero-desktop.webm',
  'assets/hero-desktop-poster.webp',
  'assets/mobile-bg.webp',
  'assets/steron-eye-source.jpg',
  'package.json',
  'package-lock.json',
  'vite.config.js',
  'ALGORITHM.md',
  'README.md',
  'LICENSE-STATUS.md',
  'dist/index.html',
  'dist/entries.txt',
  'dist/draw-config.json',
  'dist/draws/steron-2026-09.json',
  'dist/assets/steron-draw-app.js',
  'dist/assets/steron-draw-app.js.map',
  'dist/assets/desktop-bg.webp',
  'dist/assets/hero-desktop.mp4',
  'dist/assets/hero-desktop.webm',
  'dist/assets/hero-desktop-poster.webp',
  'dist/assets/mobile-bg.webp',
  'dist/assets/steron-eye-source.jpg',
  'dist/assets/cinzel-latin-600-normal.woff2',
  'dist/assets/cinzel-latin-ext-600-normal.woff2',
];

const files = [];
for (const candidate of candidateFiles) {
  const absolutePath = resolve(projectRoot, candidate);
  try { await access(absolutePath); } catch { continue; }
  const bytes = await readFile(absolutePath);
  files.push({
    path: relative(projectRoot, absolutePath).replaceAll('\\', '/'),
    bytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}

const manifest = {
  schemaVersion: 1,
  releaseVersion: '1.0.3',
  publicationStatus: 'public-committed',
  source: {
    status: 'public',
    url: 'https://github.com/martinbmatuska-cmd/STERON-transparent-draw',
    version: 'STERON transparentné žrebovanie v1.0.3 — verejný release',
    commit: null,
  },
  note: 'Verejne nasadený artifact vzniká z tohto repozitára. Presný Git commit nasadenia zapisuje GitHub Pages workflow do build-info.json.',
  hashScope: 'Presné bajty uvedených súborov. release-manifest.json a CHECKSUMS.sha256 sú zámerne mimo zoznamu, aby nevznikol samoreferenčný hash.',
  files,
};

const output = `${JSON.stringify(manifest, null, 2)}\n`;
await writeFile(resolve(projectRoot, 'release-manifest.json'), output, 'utf8');
await writeFile(resolve(projectRoot, 'dist/release-manifest.json'), output, 'utf8');
