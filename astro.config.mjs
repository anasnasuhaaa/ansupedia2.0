import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    // sanitize-html uses require() for the ESM-only htmlparser2. Bundle both so
    // Vercel doesn't need runtime require(ESM) support to load the sanitizer.
    ssr: { noExternal: ['sanitize-html', 'htmlparser2'] },
  },
});
