// src/pages/api/article.js
export const prerender = false; // ie. SSR

import { checkUser } from '@utils/authCheck';
// import { saveArticle } from '@utils/db';
import { getPostFromSlug } from '@utils/utils';
import yaml from 'js-yaml';
// import brand from '@data/site.json';
import fs from 'fs';
import matter from 'gray-matter';
import path from 'path';
import { updateGithubFiles } from '@utils/github_tools'; // array of {path, content} objects


export const POST = async ({ request }) => {
  // console.log('POST request to /api/article');
  const user = await checkUser(request);
  if (!user.authenticated) return new Response('Unauthorized', { status: 401 });
  const { slug, content, meta } = await request.json();
  if (!slug && (content || meta)) return new Response('Slug, content or meta required', { status: 400 });
  var article = await getPostFromSlug(slug);
  if (!article && (content && meta)) return new Response('If new article, both content AND meta required', { status: 400 });
  // replace out data and content of article if exists
  if (article) {
    const articlePath = path.join(process.cwd(), 'src/content', article.collection, article.id)
    const articleRaw = fs.readFileSync(articlePath, 'utf8');
    const { data: articleMeta, content: articleContent } = matter(articleRaw);
    article.data = meta || articleMeta;
    article.content = content || articleContent;
  } else article = {collection:'post', id:`${slug}/index.mdoc`, data:meta, content}
  // console.log('meta:', meta);
  const filedata = `---\n${yaml.dump(article.data)}---\n\n${article.content}`;
  const filepath = `src/content/${article.collection}/${article.id}`
  const updated = await updateGithubFiles([{path: filepath, content: filedata}], 'API updated article');
  if (updated) return new Response('Article updated', { status: 200 });
    else return new Response('Article update failed', { status: 400 });
};


export const GET = async ({ request }) => {
  // const user = await checkUser(request);
  // if (!user.authenticated) return new Response('Unauthorized', { status: 401 });
  const url = new URL(request?.url);
  const slug = url.searchParams.get('slug');
  if (!slug) return new Response('Article slug required', { status: 400 });
  // const article = await getCurrentArticlePost(slug);
  const article = await getPostFromSlug(slug);
  // console.log('article:', article);
  return new Response(JSON.stringify(article), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};


export const DELETE = async ({ request }) => {
  const user = await checkUser(request);
  if (!user.authenticated) return new Response('Unauthorized', { status: 401 });
  const url = new URL(request?.url);
  const slug = url.searchParams.get('slug');
  if (!slug) return new Response('Article slug required', { status: 400 });
  await deletePendingPost('article', slug);
  return new Response('Article deleted', { status: 200 });
};



