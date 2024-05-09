// post /api/upload_s3
export const prerender = false;

import { uploadS3, getTeamMemberBySlug } from '@utils/utils.js';
import { lucia } from "../../lib/auth";

// console.log('Just entered /api/upload_s3')

// export const POST = async ({ request }) => {
//   if (request.headers.get("Content-Type") === "application/json") {
//     const body = await request.json();
//     let {filedata, s3key} = body;

//     // validate user has team role
//     const { user } = Astro.locals || {};
//     console.log('user:', Astro.locals);
//     if (!['superadmin', 'admin','editor','writer'].includes(user.role)) {
//       return new Response('User verification failed', { status: 400 });
//     }

//     // validate user is valid team member
//     let member = await getTeamMember(user.email);
//     console.log('member:', member);
//     if (!member) return new Response('User not found', { status: 400 });

//     // validate filedata
//     if (!filedata) return new Response('No filedata provided', { status: 400 });

//     // upload to S3
//     let s3url = await upload_s3(filedata, s3key);

//     if (s3url) return new Response(JSON.stringify({s3url}), { status: 200 });
//       else return new Response('S3 upload failed', { status: 400 });
//   }
//   return new Response(null, { status: 400 });
// }

export const POST = async ({ request }) => {
  // console.log('upload_s3 post handler', context.request.headers.get("Content-Type"));
  // Handling different content types
  if (request.headers.get("Content-Type").includes("application/json")) {
    try {
      const body = await request.json();
      const {filedata, mimeType, s3key, sessionid} = body;

      //console.log('Attempting to upload: ', s3key, sessionid, filedata.length);
      // verify session and role
      const { user } = await lucia.validateSession(sessionid);
      if (!user || !['superadmin', 'admin', 'editor', 'writer'].includes(user.role)) {
        return new Response('User authentication failed', { status: 403 });
      }
      // verify team member
      if (!(await getTeamMemberBySlug(user.id))) return new Response('User not found', { status: 404 });
      // make sure we have file data
      if (!filedata) return new Response('No filedata provided', { status: 400 });

      //console.log('uploading to s3:', s3key, mimeType, filedata.length);
      const s3url = await uploadS3(filedata, s3key, mimeType);

      //console.log('s3url:', s3url);
      return s3url ? new Response(JSON.stringify({s3url}), { status: 200 })
                   : new Response('S3 upload failed', { status: 500 });

    } catch (error) {
      console.error('Error processing request:', error);
      return new Response('Server error', { status: 500 });
    }
  } else {
    return new Response('Invalid Content-Type', { status: 415 });
  }
};


