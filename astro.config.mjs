// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // URL canónica del dominio de producción (necesario para @astrojs/sitemap)
  site: 'https://quintanamur.com',

  // Despliegue en Cloudflare Pages
  output: 'static',

  integrations: [sitemap()],

  adapter: cloudflare({
    imageService: 'passthrough'
  }),

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['@neondatabase/serverless'],
      include: ['astro/assets/services/noop']
    },
    ssr: {
      external: ['@neondatabase/serverless']
    }
  }
});
