<script>
 import { createEventDispatcher, onMount } from 'svelte';
 import ImageEditModal from './ImageEditModal.svelte';
 import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
 import { faPen } from '@fortawesome/free-solid-svg-icons';

 // export let editor;
 export let editor;
 export let node; // The image node from TipTap
 export let updateAttrs; // Function to update attributes of the node
 export let slug; // Ensure the slug is passed as a prop to this component
 // const editor = view.editor;

 //console.log('editor', editor);

 let showModal = false;
 let displayedSrc = ''; // This will hold the processed src

 const dispatch = createEventDispatcher();

 onMount(() => {
   processSrc(node.attrs.src); // Process src on mount
 });

 // Reactively update displayedSrc whenever node.attrs.src changes
 $: if (node && node.attrs.src) {
   processSrc(node.attrs.src);
 }
 // $: showModal ? editor.setOptions({editable: false}) : editor.setOptions({editable: true}); // Toggle editability

 function openEditModal() {
   showModal = !showModal;
 }

 function handleSave({ detail: { src, alt } }) {
   updateAttrs({ src, alt });
   showModal = false;
 }

 // Function to process src attribute
 function processSrc(src) {
   if (src?.startsWith('./')) {
     displayedSrc = `/api/article_image?slug=${slug}&filename=${src.substring(2)}`;
   } else {
     displayedSrc = src;
   }
 }
</script>

<div class="image-container relative w-full">
 <img src={displayedSrc} alt={node.attrs.alt} class="max-w-7xl max-h-64 mx-auto" /> <!-- Use displayedSrc here -->
 <button on:click={openEditModal} class="edit-button text-gray-300 hover:text-gray-600" style="position: absolute; top: 0; right: 0;">
     <FontAwesomeIcon icon={faPen} />
 </button>
 {#if showModal}
   <ImageEditModal on:save={handleSave} altText={node.attrs.alt} />
 {/if}
</div>


