<script>
 import { createEventDispatcher } from 'svelte';
 import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
 import { faSync } from '@fortawesome/free-solid-svg-icons';
 const dispatch = createEventDispatcher();

 export let altText;
 let imageUrl = ''; // To hold the base64 URL
 // let altText = 'Existing alt text'; // Pre-filled with existing alt text
 let imageDesc = ''; // The description to generate the image
 let slug = ''; // Assume slug is passed as a prop or somehow available

  // Function to stop event propagation
 function stopEvent(event) {
   event.stopPropagation();
 }

  // Svelte action for autofocus
 function autofocus(node) {
   setTimeout(() => node.focus(), 0);
 }

 async function generateImage(event) {
  event.stopPropagation();
   const response = await fetch(`/api/image-generate?slug=${slug}&desc=${encodeURIComponent(imageDesc)}`);
   if (response.ok) {
     const data = await response.json();
     imageUrl = data.url; // Assuming the API returns { url: 'base64...' }
   } else {
     console.error('Failed to generate image');
     // Handle error
   }
 }

 function saveImage(event) {
   event.stopPropagation();
   dispatch('save', { src: imageUrl, alt: altText });
 }
</script>

<div class="relative w-full border-2 border-gray-400 rounded p-2 bg-gray-300 shadow-lg">

 <input type="text" bind:value={altText} required placeholder="Alt text"
  class="p-2 border border-gray-300 rounded shadow w-full"
  on:click={stopEvent} on:keydown={stopEvent}
  use:autofocus />

 <textarea bind:value={imageDesc} placeholder="Regenerate Description"
  class="p-2 border border-gray-300 rounded shadow w-full h-32 mt-4"
  on:click={stopEvent} on:keydown={stopEvent}
  ></textarea>

 <div class="flex flex-row items-center w-full justify-end ">
  <button on:click={generateImage} class="mr-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
   <FontAwesomeIcon icon={faSync} class="h-5 w-5" /> Regenerate
 </button>
 <button on:click={saveImage} class=" px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
   Save Changes
 </button>
</div>
</div>


