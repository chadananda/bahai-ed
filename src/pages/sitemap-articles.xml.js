// generates a list of articles and their translations for inclusion in the overall sitemap
export const prerender = true;

import { getPublishedArticles, getArticleTranslations } from '@utils/utils.js';
import { url as siteURL }  from '@data/branding.json';

export async function GET() {
  const SITE = siteURL.endsWith('/') ? siteURL : siteURL + '/';
  const articles = await getPublishedArticles('en');
  const entries = await Promise.all(articles.map(async (article) => {
      const translations = await getArticleTranslations(article.data.url);
      let locEntries = `<url><loc>${SITE}${article.data.url}</loc>`;
      translations.forEach(({ data }) => {
          locEntries += `<xhtml:link rel="alternate" hreflang="${data.language}" href="${SITE}${data.url}" />`;
      });
      locEntries += `</url>\n`;
      return locEntries;
  }));
  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="${SITE}rss.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
      xmlns:xhtml="http://www.w3.org/1999/xhtml">
  ${entries.join('')}
</urlset>`;
  return new Response(sitemapContent, {
      headers: {
          'Content-Type': 'application/xml'
      }
  });
}