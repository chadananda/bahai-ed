<script>
import { Carta, MarkdownEditor } from 'carta-md';
import { attachment } from '@cartamd/plugin-attachment';
import { slash } from '@cartamd/plugin-slash';
import { onMount } from 'svelte';
import { emoji } from '@cartamd/plugin-emoji';
import { code } from '@cartamd/plugin-code';

// import 'carta-md/dark.css';
// import './githubEditor.scss';
import 'carta-md/default.css';
import '@cartamd/plugin-slash/default.css';
// import '@cartamd/light.css';
// import '$lib/styles/github.scss';
  export let post;
  export let site;
  export let translations;
  export let authorList;
  export let topicList;
  export let categoryList;
  export let languages;
  export let client;

  const carta = new Carta({
    theme: 'github-light',
    extensions: [
      attachment({
        async upload(file) {
          const formData = new FormData();
          formData.append('file', file);
          const response = await fetch('/api/upload_s3', { method: 'POST', body: formData });
          return response.json(); // Assuming server returns JSON with the URL
        }
      }),
      emoji(),
			slash(),
			code()
    ],
    // sanitizer: isomorphicDompurify.sanitize
  });

  let selectedLanguage = 'en';
  let tags = '';
  let keywords = '';

  export let slug;
  export let value = "initial value";

  $:value = content;

  let content = "";
  let meta = {};


  // Simulated function to switch content based on language
  function loadContent(lang) {
    selectedLanguage = lang;
  }

  // Function to handle saving the post
  function savePost() {
   // console.log('Saving post...');
    // Implement actual save functionality
  }

  onMount(() => {
    content = post?.body || ''; // Initialize with current post body or empty string
  });

 </script>



<style>
  .editor {
      padding: 20px;
      width: 100%;
  }

  /* Custom monospace font for code within the editor */
  :global(.carta-font-code) {
      font-family: 'Courier New', monospace;
      font-size: 1.1rem;
  }

  /* Targeting deeper within the editor if needed */
  :global(.carta-editor-container) {
    overflow: visible !important;
    height: auto !important;
  }

</style>






 <div class="editor" class:visible={client}>

   <MarkdownEditor bind:value mode="tabs" {carta}/>

 </div>
