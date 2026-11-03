import { defineConfig } from 'astro/config';

const base = '/warlock-resources';

export default defineConfig({
  site: 'https://aviditywow.github.io',
  base,
  // Clean URLs: each page is a folder (wands/index.html), linked as /warlock-resources/wands/.
  build: { format: 'directory' },
  trailingSlash: 'ignore',
  // Astro doesn't prefix redirect targets with the base, so they're written out in full.
  redirects: {
    '/home': `${base}/`,
  },
});
