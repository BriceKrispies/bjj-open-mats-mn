import { defineConfig } from 'astro/config';

// On GitHub Actions GITHUB_ACTIONS=true is set automatically.
// The repo is deployed at https://BriceKrispies.github.io/bjj-open-mats-mn/
// Trailing slash is required so import.meta.env.BASE_URL is '/bjj-open-mats-mn/'
const base = process.env.GITHUB_ACTIONS ? '/bjj-open-mats-mn/' : '';

export default defineConfig({
  base,
  server: {
    port: 3000,
  },
  vite: {
    server: {
      hmr: {
        protocol: 'ws',
        host: 'localhost',
      },
    },
  },
});
