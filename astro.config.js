// astro.config.js
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
// import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import vercel from '@astrojs/vercel/serverless';
// import vercel from '@astrojs/vercel/static';
// import { getSitemapArticles } from './src/utils/utils.js';

import svelte from '@astrojs/svelte';
import markdoc from "@astrojs/markdoc";
import site from './src/data/site.json'; // for branding
// import icon from "astro-icon";
import minify from 'astro-min';
// import compress from "astro-compress";
// import partytown from '@astrojs/partytown';
import react from "@astrojs/react";
import db from "@astrojs/db";
const isDev = process.env.NODE_ENV === 'development';
const siteMapConfig = {
  filter: url => {
    // Define the base paths to include in the sitemap
    const includedBasePaths = ['/', '/about/', '/contact/', '/privacy/'];
    // Define the directory paths to include in the sitemap
    const includedDirectories = ['/topics/', '/categories/', '/authors/'];
    const pathname = new URL(url).pathname;
    return includedBasePaths.includes(pathname) || includedDirectories.some(dir => pathname.startsWith(dir));
  }
  // additionalSitemaps: [ site.url + '/sitemap_articles.xml' ]
};
const minifyConfig = {
  do_not_minify_doctype: true,
  ensure_spec_compliant_unquoted_attribute_values: true,
  keep_closing_tags: true,
  keep_comments: false,
  keep_html_and_head_opening_tags: true,
  keep_input_type_text_attr: false,
  keep_spaces_between_attributes: true,
  keep_ssi_comments: false,
  minify_css: true,
  minify_js: true,
  preserve_brace_template_syntax: false,
  preserve_chevron_percent_template_syntax: false,
  remove_bangs: false,
  remove_processing_instructions: false
};


// https://astro.build/config
export default defineConfig({
  site: site.url,
  output: 'hybrid',
  // output: 'server',
  adapter: vercel({
    imageService: false,
    webAnalytics: {
      enabled: true
    }
    // functionPerRoute: true, // does not work with hobby version of vercel
    // serviceEntryPoint: '@astrojs/image/sharp',
    // imagesConfig: {
    //   sizes: [120, 188, 300, 372, 788, 1000, 1280],
    //   formats: ["image/webp", "image/jpg"],
    // },
  }),
  integrations: [tailwind(),
  //mdx(),
  sitemap(siteMapConfig), svelte(), markdoc({
    allowHTML: true
  }),
  //  icon(),
  //  compress(),
  minify(minifyConfig),
  // partytown()
  react(), db()],
  experimental: {
    // contentCollectionCache: true,
  },
  prefetch: {
    defaultStrategy: 'viewport',
    prefetchAll: !isDev
  },
  vite: {
    optimizeDeps: {
			exclude: ["oslo", "astro:db"]
		},
    build: {
      // minify: false,
    },

    logLevel: 'info',
    server: {
      watch: {
        ignored: ['**/node_modules/**', '**/.vscode/**', '**/.vercel/**', '**/dist/**', '**/public/**', '**/.astro/**', '.env', '.git', '.DS_Store', '.aider.chat.history.md', '.aider*','src/content/topics/*', 'src/content/categories/*', 'src/content/faqs/*',
        // 'src/content/proposals/*', 'src/content/structure/*', 'src/content/subtopics/*',
        // 'src/content/team/*', '**/**'
        ]
      },
      logLevel: 'info'
    }
  }
});