// src/pages/api/article.js
export const prerender = false;

import { updatePost_DB, getTeamMemberBySlug, slugify, getPostFromSlug } from '@utils/utils.js';
import { lucia } from "../../lib/auth";


export const POST = async ({ request }) => {
  console.log('POST request to /api/article');
  const {post, sessionid} = await request.json();
  if (!post) return new Response('Slug, content or meta required', { status: 400 });
  if (!sessionid) return new Response('User session required', { status: 400 });
  // verify session and role
  const { user } = await lucia.validateSession(sessionid);
  if (!user || !['superadmin', 'admin', 'editor', 'writer'].includes(user.role)) {
    return new Response('User authentication failed', { status: 403 });
  }
  // verify is team member
  if (!(await getTeamMemberBySlug(user.id))) return new Response('User not found', { status: 404 });
  // new articles need a slug and id
  if (!post.id) { // assign
    const slug = slugify(post.title);
    post.data.url = slug
    const date = new Date().toISOString().split('T')[0];
    const lang = post.data.language || 'en'
    post.id = `${date}-${slug}/${lang === 'en' ? 'index' : lang}.md`
  }

  try {
    await updatePost_DB(post);
    return new Response(JSON.stringify(post), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('Error updating post:', e);
    return new Response('Update failed', { status: 400 });
  }
};


export const GET = async ({ request }) => {
  // authenticate user?
  const url = new URL(request?.url);
  const slug = url.searchParams.get('slug');
  if (!slug) return new Response('Article slug required', { status: 400 });
  const post = await getPostFromSlug(slug);
  return new Response(JSON.stringify(post), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};


export const DELETE = async ({ request }) => {
  // const user = await checkUser(request);
  // if (!user.authenticated) return new Response('Unauthorized', { status: 401 });
  // const url = new URL(request?.url);
  // const slug = url.searchParams.get('slug');
  // if (!slug) return new Response('Article slug required', { status: 400 });
  // await deletePendingPost('article', slug);
  // return new Response('Article deleted', { status: 200 });
};



