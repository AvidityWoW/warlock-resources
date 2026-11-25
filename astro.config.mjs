import { defineConfig } from 'astro/config';
import editor from './src/editor/integration.mjs';

const base = '/warlock-resources';

export default defineConfig({
  site: 'https://aviditywow.github.io',
  base,
  // Clean URLs: each page is a folder (wands/index.html), linked as /warlock-resources/wands/.
  build: { format: 'directory' },
  trailingSlash: 'ignore',
  // dev only: edit the pages' text in the browser (npm run dev, then Edit text in the header); does nothing in a build
  integrations: [editor()],
  // Astro doesn't prefix redirect targets with the base, so they're written out in full.
  redirects: {
    '/home': `${base}/`,
  },
});
