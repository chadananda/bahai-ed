// post comment, expecting an object like
// {slug, context, name, email, content, postId, parentid, timestamp, starred}
//
export const prerender = false;

import { sanitizeInput, isValidEmail } from '@utils/utils.js';
import { getDataCollectionEntry } from '@utils/utils.js';

console.log('Just entered /api/post_comment')

async function getArticleCommentsLastPostDate(slug) {
  let anHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
  try {
    const entry = await getDataCollectionEntry('comments', slug);
    return entry?.data?.lastPostDate || anHourAgo;
  } catch { return anHourAgo; }
}


export const POST = async ({ request }) => {
  if (request.headers.get("Content-Type") === "application/json") {
    const body = await request.json();
    let {slug, name, email, content, postid, parentid, website, phone} = body;
    // validate, sanitize and save the comment
    name = sanitizeInput(name, 40);
    email = sanitizeInput(email, 40);
      email = isValidEmail(email) ? email : '';
    content = sanitizeInput(content, 2000);
    let date = new Date().toISOString();
    const sanitizedPost = {slug, name, email, content, postid, parentid, date, starred: false}
    // must include name and content but not website or phone (honeypots)
    let validSubmission = !!name && !!content && !website && !phone;
    // also invalidate if the content contains a link
    if (content.includes('http')) validSubmission = false;


    if (validSubmission) {
       let lastPostDateString = await getArticleCommentsLastPostDate(slug)
      //  await saveCommentPost(sanitizedPost);

      // Parse the last post date string as a Date object
      let lastPostDate = new Date(lastPostDateString);
      let currentDate = new Date();

       // trigger processing if > 30 minutes since last saved for this post
       // if (lastPostDate.getTime() < currentDate.getTime() - 1000 * 60 * 30) {
       //  let origin = new URL(request.url).origin;
       //  fetch(`${origin}/api/process_posts`, { method: 'GET' })
       //    .then(response => console.log('Processing triggered'))
       //    .catch(error => console.error('Error triggering processing', error));
       // } else console.log('not triggering a processing call');


    } else console.log('invalid submission', sanitizedPost);

    // return sanitized values and a fake starred status:
    return new Response(JSON.stringify({...sanitizedPost, starred: true}), {status: 200})
  }
  return new Response(null, { status: 400 });
}
