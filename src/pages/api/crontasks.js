export const prerender = false; // APIs must exclude ssr

import { poorMansCron } from '@utils/utils.js';

// usage:
// 1. All page templates fetches this API endpoint asyncronously
  // like  <script type="module" src="/api/crontasks" client:idle></script>
// 2. this API script runs poorMansCron()
// 3. poorMansCron() calls crontasks() -- throttled down to once in five minutes
// 4. crontasks() does expensive server-side processing

export const GET = async ({ request }) => {
  await poorMansCron();
  return new Response('', {status: 200})
}

