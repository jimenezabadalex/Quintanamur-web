/**
 * Helper to generate correct URLs taking into account Astro's configured `base` path (e.g. GitHub Pages repo name).
 * Works seamlessly both with a base path (`/Quintanamur-web/`) and with a custom root domain (`/`).
 */
export function url(path = ''): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;

  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${base}${cleanPath}`;
}
