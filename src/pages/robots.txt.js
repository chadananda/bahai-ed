// src/pages/robots.txt.js
export const prerender = true;

import {url as siteUrl} from '@data/site.json';

export async function GET() {
  const content = `
User-agent: *
Disallow: /admin/
Disallow: /login
Disallow: /contact

Sitemap: ${siteUrl}/sitemap-index.xml
Sitemap: ${siteUrl}/sitemap-articles.xml
  `.trim();

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain'
    }
  });
}
