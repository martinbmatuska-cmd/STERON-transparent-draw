import { copyFileSync, cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/steron-draw-app.js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  plugins: [{
    name: 'copy-steron-draw-data',
    closeBundle() {
      const dist = resolve(root, 'dist');
      mkdirSync(resolve(dist, 'assets'), { recursive: true });
      mkdirSync(resolve(dist, 'draws'), { recursive: true });
      copyFileSync(resolve(root, 'assets/desktop-bg.webp'), resolve(dist, 'assets/desktop-bg.webp'));
      copyFileSync(resolve(root, 'assets/hero-desktop.mp4'), resolve(dist, 'assets/hero-desktop.mp4'));
      copyFileSync(resolve(root, 'assets/hero-desktop.webm'), resolve(dist, 'assets/hero-desktop.webm'));
      copyFileSync(resolve(root, 'assets/hero-desktop-poster.webp'), resolve(dist, 'assets/hero-desktop-poster.webp'));
      copyFileSync(resolve(root, 'assets/mobile-bg.webp'), resolve(dist, 'assets/mobile-bg.webp'));
      copyFileSync(resolve(root, 'assets/steron-eye-source.jpg'), resolve(dist, 'assets/steron-eye-source.jpg'));
      copyFileSync(resolve(root, 'entries.txt'), resolve(dist, 'entries.txt'));
      copyFileSync(resolve(root, 'draw-config.json'), resolve(dist, 'draw-config.json'));
      cpSync(resolve(root, 'draws'), resolve(dist, 'draws'), { recursive: true });
    },
  }],
});
