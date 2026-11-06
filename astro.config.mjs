import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
