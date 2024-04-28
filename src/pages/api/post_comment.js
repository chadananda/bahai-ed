// post comment, expecting an object like
// {slug, context, name, email, content, postId, parentid, timestamp, starred}
//
export const prerender = false; // APIs must exclude ssr

import { sanitizeInput, moderateComments_openai, updateComment } from '@utils/utils.js';


export const POST = async ({ request }) => {
  if (request.headers.get("Content-Type") === "application/json") {
    let {postid, parentid, name, content, website, phone} = await request.json();
    // description = sanitizeInput(description, 2000);
    name = sanitizeInput(name, 40);
    content = sanitizeInput(content, 2000);
    let id = parseInt(Math.random().toString(10).substr(2, 12));
    let sanitizedPost = { id, postid, parentid, name, content }
    let validSubmission = !!name && !!content && !website && !phone && !content.includes('http');
    // save to db
    if (validSubmission)  await updateComment(sanitizedPost);
      else console.log('invalid submission', sanitizedPost);
    // return sanitized values and a fake starred & moderated status:
    return new Response(JSON.stringify({...sanitizedPost, date: new Date().toISOString(),
       moderated:true, starred: true}), {status: 200})
  }
  return new Response(null, { status: 400 });
}
