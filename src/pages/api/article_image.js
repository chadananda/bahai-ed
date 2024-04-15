// src/pages/api/article.js
export const prerender = false; // ie. SSR

import yaml from 'js-yaml';
// import brand from '@data/site.json';
import fs from 'fs';
import matter from 'gray-matter';
import path from 'path';
import { updateGithubFiles } from '@utils/github_tools'; // array of {path, content} objects
import { promisify } from 'util';
const readFileAsync = promisify(fs.readFile);

export const POST = async ({ request }) => {
  // // console.log('POST request to /api/article');
  // const user = await checkUser(request);
  // if (!user.authenticated) return new Response('Unauthorized', { status: 401 });
  // const { slug, content, meta } = await request.json();
  // if (!slug && (content || meta)) return new Response('Slug, content or meta required', { status: 400 });

  // stop, this needs to be changed to getPostFromSlug
  // var article = await getPostFromSlug(slug);
  // if (!article && (content && meta)) return new Response('If new article, both content AND meta required', { status: 400 });
  // // replace out data and content of article if exists
  // if (article) {
  //   const articlePath = path.join(process.cwd(), 'src/content', article.collection, article.id)
  //   const articleRaw = fs.readFileSync(articlePath, 'utf8');
  //   const { data: articleMeta, content: articleContent } = matter(articleRaw);
  //   article.data = meta || articleMeta;
  //   article.content = content || articleContent;
  // } else article = {collection:'post', id:`${slug}/index.mdoc`, data:meta, content}
  // // console.log('meta:', meta);
  // const filedata = `---\n${yaml.dump(article.data)}---\n\n${article.content}`;
  // const filepath = `src/content/${article.collection}/${article.id}`
  // const updated = await updateGithubFiles([{path: filepath, content: filedata}], 'API updated article');
  // if (updated) return new Response('Article updated', { status: 200 });
  //   else return new Response('Article update failed', { status: 400 });
};


export const GET = async ({ request }) => {
  const url = new URL(request?.url);
  const slug = url.searchParams.get('slug');
  const filename = url.searchParams.get('filename');
//  console.log('GET request to /api/article_image', slug, filename);
  if (!slug || !filename) return new Response('Slug and Filename both required', { status: 400 });
  const filepath = path.join(process.cwd(), 'src/content', 'posts', slug, filename);
  const found = fs.existsSync(filepath)
  if (!fs.existsSync(filepath)) return new Response('Article image not found: '+filename, { status: 404 });

  // Determine the content type based on the file extension (simplified example)
  let contentType = 'application/octet-stream'; // Default to binary stream
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg'))  contentType = 'image/jpeg';
    else if (filename.endsWith('.png')) contentType = 'image/png';
    else if (filename.endsWith('.gif')) contentType = 'image/gif';
    else if (filename.endsWith('.webp')) contentType = 'image/webp';
    else if (filename.endsWith('.svg')) contentType = 'image/svg+xml';

  try {
    const imageBuffer = await readFileAsync(filepath);
    return new Response(imageBuffer, { status: 200, headers: { 'Content-Type': contentType } });
  } catch (error) {
    // console.error('Error reading image file:', error); // Log the error for debugging purposes
    return new Response('Error reading image file: ' + filepath, { status: 500 });
  }
};


export const DELETE = async ({ request }) => {
  // const user = await checkUser(request);
  // if (!user.authenticated) return new Response('Unauthorized', { status: 401 });
  // const url = new URL(request.url);
  // const slug = url.searchParams.get('slug');
  // if (!slug) return new Response('Article slug required', { status: 400 });
  // await deletePendingPost('article', slug);
  // return new Response('Article deleted', { status: 200 });
};



