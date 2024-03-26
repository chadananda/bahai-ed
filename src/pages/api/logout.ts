// src/pages/api/logout.ts
export const prerender = false;

import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request }) => {
 // console.log('logout with API: src/pages/api/logout.ts');
  const headers = new Headers();
  headers.append('Set-Cookie', 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure');
  return new Response(null, { status: 200, headers });
}
