<script>
import { writable } from 'svelte/store';

export let slug; // Article slug
export let context; // Text string for moderation context
export let posts; // Array of comment posts
export let apiEndpoint; // API endpoint for posting comments

let name = ''; // User's name
let email = ''; // User's email (optional)
let content = ''; // Comment or reply content
let website = ''; // Honeypot field for spam prevention
let phone = ''; // Honeypot field for spam prevention
let activeReplyId = writable(null); // Currently active reply form's target comment ID

let orderedPosts = []
let indentedPosts = []

  // Function to toggle the reply form next to the intended comment
function toggleReplyForm(id) {
  activeReplyId.update(current => current === id ? null : id);
}

async function submitComment(event, parentid = null) {
  event.preventDefault();
  activeReplyId.set(null); // Close the reply form after submitting
  try {
    let postid = Math.random().toString(36).substr(2, 10); // Generate a unique ID for the comment
    const res = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({slug, context, name, email, content, postid, parentid, website, phone })
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    let newComment = await res.json(); // Assuming this includes all necessary fields

  // console.log('returned comment data', newComment);

    if (parentid) {
      // Find the index of the parent comment
      const parentIndex = orderedPosts.findIndex(post => post.postid === parentid);
      const parentComment = orderedPosts[parentIndex];
      let indentLevel =  Math.min(parentComment.indentLevel + 1, 2);
      newComment = { ...newComment, indentLevel };
      orderedPosts.splice(parentIndex + 1, 0, newComment);
      activeReplyId.set(null); // Close the reply form after submitting
    } else orderedPosts.push(newComment);
    // orderedPosts = [...orderedPosts]; // force reactivity
    indentedPosts = indentCommentPosts(orderedPosts);
    // name = ''; email = '';
    content = ''; // Clear the regular form fields
  } catch (error) {
    console.error("Failed to submit comment:", error);
  }
}

function sortComments(comments) {
  // Map comments for quick reference by postid.
  const commentMap = new Map(comments.map(comment => [comment.postid, comment]));

  // Define a helper to find index of a comment's parent in the original array.
  const findParentIndex = (comment) => comments.findIndex(c => c.postid === comment.parentid);

  return comments.slice().sort((a, b) => {
    // Compare top-level comments by date.
    if (!a.parentid && !b.parentid) return new Date(a.date) - new Date(b.date);
    // Prioritize parent comments to come before their children.
    if (a.postid === b.parentid) return -1;
    if (b.postid === a.parentid) return 1;
    // Sort siblings by date.
    if (a.parentid === b.parentid) return new Date(a.date) - new Date(b.date);
    // Sort by parents' positions.
    return findParentIndex(a) - findParentIndex(b);
  });
}

function indentCommentPosts(sortedComments) {
  if (!sortedComments || !Array.isArray(sortedComments) || sortedComments.length === 0)  return [];
  let previousComment = null;
  // The map will hold the indent levels for each postid.
  const indentLevelMap = new Map();
  const indentedComments = sortedComments.map((comment, index) => {
    // Default indent level is 0 (top-level comment).
    let indentLevel = 0;
    let arrowType = null;
    // If the comment is a reply to another comment, increment the indent level.
    if (comment.parentid && indentLevelMap.has(comment.parentid)) {
      // This is a nested comment, so we set its indent level to one more than its parent's level.
      indentLevel = indentLevelMap.get(comment.parentid) + 1;
    }
    // Save the indent level in the map for potential child comments.
    indentLevelMap.set(comment.postid, indentLevel);
    // Determine arrow type based on the relationship to the previous comment.
    if (previousComment) {
      if (comment.parentid === previousComment.postid) {
        // This comment is a direct reply to the one above.
        arrowType = indentLevel === 1 ? 'large' : 'small';
      }
    }
    // Update the previousComment to the current one for the next iteration.
    previousComment = comment;
    // Return the comment with the additional properties.
    return { ...comment, indentLevel, arrowType };
  });
  // now calculate the arrow type for each comment
  indentedComments.forEach((comment, index, array) => {
    if (index > 0) { // Skip the first item
      const prevComment = array[index - 1];
      comment.arrowType = prevComment.postid === comment.parentid ? 'direct-reply' : '';
    } else {
      comment.arrowType = '';
    }
  });
  return indentedComments;
}

 // Initially process comments to assign indent levels
orderedPosts = sortComments(posts);
indentedPosts = indentCommentPosts(orderedPosts);

const getAvatarColor = name => {
  const hash = name.split('').reduce((acc, char) => (((acc << 5) - acc) + char.charCodeAt(0)) | 0, 0);
  let [r, g, b] = [1, 3, 5].map(offset => ((hash >> (offset * 8)) & 0xFF) + 255).map(val => Math.floor(val / 2).toString(16).padStart(2, '0'));
  return `#${r}${g}${b}`;
};
</script>




{#each indentedPosts as post}
 <div class={`comment mt-0 level${post.indentLevel} ${post.starred?'starred':''} ${post.arrowType} relative `} id={post.postid}>

  <!-- Lines for indentation -->
  {#if post.indentLevel > 0}
    {#each Array(post.indentLevel).fill() as _, i (i)}
      <div class="line" style="left: calc(10px + 5px * {i});"></div>
    {/each}
  {/if}

   <div class={`flex flex-col space-y-2 indent-content`}>

      <!-- first line  -->
      <div class="firstline flex items-center gap-3">
        <!-- avatar  -->
        <div class="avatar w-10 h-10 rounded-full flex items-center justify-center"
          style={`background-color: ${getAvatarColor(post.name)}; border: 2px solid white;`}>
          <span class="text-2xl font-mono text-white -webkit-text-stroke-1">{post.name.charAt(0)}</span>
        </div>
        <!-- name   -->
        <div class="font-bold">{post.name}</div>
        <!-- date  -->
        <div class="text-sm text-gray-500">{new Date(post.date).toLocaleDateString()}</div>
        <!-- postid and parentid -->
        <!-- <div class="text-sm text-gray-500">id: {post.postid} / parent: {post.parentid}</div> -->
      </div>

      <!-- content  -->
      <p class="ml-5 whitespace-pre-line">{post.content}</p>

      <!-- action buttons  -->
      <div class="flex justify-end space-x-5 text-sm" data-id={post.postid}>
        <button class="text-gray-500 hover:text-gray-700" title="Like">❤️</button>
        <button class="text-gray-500 hover:text-gray-700 text-xl" title="Flag">⚑</button>
        <button on:click={() => toggleReplyForm(post.postid)} title="Reply"
          class="text-left bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-1 rounded-md self-start">Reply</button>
      </div>


      {#if $activeReplyId === post.postid}
        <form on:submit|preventDefault={(e) => submitComment(e, post.postid)} class="space-y-4 p-2 m-5 border border-gray-300 rounded-md shadow-md bg-slate-100">
            <textarea bind:value={content} rows="3"
                class="shadow-sm focus:ring-indigo-600 focus:border-indigo-500 mt-1 p-3 block w-full sm:text-sm border border-gray-300 rounded-md overflow-hidden"
                placeholder="Write your reply..." required></textarea>
            <div class="flex gap-2 mt-0 pt-2">
                <input type="text" bind:value={name} class="shadow-sm focus:ring-indigo-600 focus:border-indigo-500 p-1 px-3 flex-1 sm:text-sm border border-gray-300 rounded-md" placeholder="Full Name" required />
                <input type="email" bind:value={email} class="shadow-sm focus:ring-indigo-600 focus:border-indigo-500 p-1 px-3 flex-1 sm:text-sm border border-gray-300 rounded-md" placeholder="Email (optional)" />
                <button type="submit" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-500 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600">
                    Post<span class="hidden sm:inline">&nbsp;Reply</span>
                </button>
            </div>
              <!-- Hidden Fields (Honeypots) -->
            <input type="text" name="website" value="" style="display: none;">
            <input type="text" name="phone" value="" style="display: none;">
        </form>
        <div class="w-full h-10"> </div>
      {/if}

    </div>
    {#if post.indentLevel > 0}
      <div class={`reply-arrow reply-arrow-${post.indentLevel}`}></div>
    {/if}
  </div>
 {/each}

<!-- Main Comment Form for new comments at the bottom -->
<div class="new-comment-form mt-8">
{#if $activeReplyId === null}
<form on:submit|preventDefault={(e) => submitComment(e)} class="space-y-4 p-2 m-5 border border-gray-300 rounded-md shadow-md bg-slate-100 overflow-hidden">
    <textarea bind:value={content} rows="3" class="shadow-sm focus:ring-indigo-600 focus:border-indigo-500 mt-1 p-3 block w-full sm:text-sm border border-gray-300 rounded-md" placeholder="Write a comment..." required></textarea>
    <div class="flex gap-2 mt-0 pt-2">
        <input type="text" bind:value={name} class="shadow-sm focus:ring-indigo-600 focus:border-indigo-500 p-1 px-3 flex-1 sm:text-sm border border-gray-300 rounded-md" placeholder="Full Name" required />
        <input type="email" bind:value={email} class="shadow-sm focus:ring-indigo-600 focus:border-indigo-500 p-1 px-3 flex-1 sm:text-sm border border-gray-300 rounded-md" placeholder="Email (optional)" />
        <button type="submit" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-500 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 overflow-hidden line-clamp-1">
            Post<span class="hidden sm:inline">&nbsp;Comment</span>
        </button>
    </div>
    <!-- Hidden Fields (Honeypots) -->
    <input type="text" name="website"  bind:value={website} style="display: none;">
    <input type="text" name="phone" bind:value={phone} style="display: none;">
</form>
{/if}
</div>

<style>
  .avatar {
    text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
  }

  /* Base comment style */
  .comment {
    position: relative;
    padding-left: 20px; /* Adjust as needed for content spacing */
  }

  .comment.level1 { padding-left: 40px; }
  .comment.level2 { padding-left: 60px; }
  .comment.level3 { padding-left: 80px; }

  /* Lines for indentation levels */
  .line {
    position: absolute;
    width: 1px;
    background: #ccc; /* Line color */
    top: 0;
    bottom: 0;
  }

  .level0 .line { display: none; }
  .level1 .line { left: 10px; }
  .level2 .line { left: 20px; }
  .level3 .line { left: 30px; }

  /* Adjust the number of lines and spacing as needed */

  /* Comment box and text styling */
  .comment-box { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
  .comment-text { background: white; padding: 0.5rem; border-radius: 4px; }

  /* add highlight background and glow */
  .starred {
    background: #fefef2;
  }

  /* Button styles */
  .comment-action, .like, .report, .reply {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid transparent;
    text-align: center;
  }
  .comment-action { background: #f3f4f6; color: #1f2937; }
  .like, .report { background: none; color: #9ca3af; }
  .reply { background: #f3f4f6; color: #1f2937; border: 1px solid #d1d5db; padding: 0.25rem 0.75rem; }

  /* Reply arrows */
  .direct-reply:before {
    content: '';
    position: absolute;
    top: -70px; /* Adjust as needed */
    left: 30px; /* Adjust as needed */
    width: 22px; /* Width of the arrow */
    height: 100px; /* Height of the arrow */
    background: url('/article_assets/indent-arrow.svg') no-repeat center center;
    background-size: contain;
    transform: rotate(20deg);
  }

  .level2.direct-reply:before { left: 52px }
  .level3.direct-reply:before { left: 65px }
  .level3.direct-reply:before { left: 71px }

  /* If direct-reply is not showing, it could be due to the specificity or other CSS overriding it.
     Make sure .direct-reply is added to the correct element and there is no other CSS overriding it. */
</style>
