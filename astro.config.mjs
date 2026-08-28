// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // URL base de tu GitHub Pages
  site: 'https://jimenezabadalex.github.io',
  base: '/Quintanamur-web',

  vite: {
    plugins: [tailwindcss()]
  }
});
