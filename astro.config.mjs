import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [react()],
  vite: {
    plugins: [
      tailwindcss(),
      {
        name: 'bundle-sanitizer-for-production',
        apply: 'build',
        // Bundle CommonJS and ESM together for Vercel. In dev, let Node load
        // sanitize-html natively so Vite doesn't evaluate require() as ESM.
        config: () => ({ ssr: { noExternal: ['sanitize-html', 'htmlparser2'] } }),
      },
    ],
  },
});
