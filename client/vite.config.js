import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

// Manual version file, edited by hand on each release. Served by Express at
// runtime (/assets/version.json) and read here at build time so the running
// bundle knows its own version.
const VERSION_FILE = path.resolve(__dirname, '../public/assets/version.json');

function readVersionFile() {
  try {
    const parsed = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf-8'));
    const value = typeof parsed === 'string' ? parsed : parsed && parsed.version;
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  } catch (e) {
    // Missing or invalid file: fall back to the git commit count below.
  }
  return null;
}

function gitCommitCount() {
  try {
    const count = execSync('git rev-list --count HEAD', {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString().trim();
    if (count) return count;
  } catch (e) {
    // Not a git repository or git not available.
  }
  return null;
}

// Version priority: public/assets/version.json > git commit count > '0'.
const APP_VERSION = readVersionFile() || gitCommitCount() || '0';

export default defineConfig({
  plugins: [vue()],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION)
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/locales': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/data': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/assets': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
