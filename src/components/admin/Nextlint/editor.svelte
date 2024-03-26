<script lang="ts">
 import {type Editor, EditorTheme, SvelteEditor} from '@nextlint/svelte';

 export let content, meta, slug;

 let editor: Editor;

 const submitPrompt = async (prompt: string) => {
   // handle prompt for GPT plugin
   return '';
 };

 const handleUpload = async (file: File) => {
   // handle upload here
   const blob = new Blob([file]);
   const previewUrl = URL.createObjectURL(blob);
   return previewUrl;
 };

</script>

<EditorTheme>
 <SvelteEditor
   content={''}
   placeholder="Press 'space' GPT support, type '/' for help"
   onCreated={createdEditor => { editor = createdEditor }}
   onChange={nextEditor => { editor = nextEditor }}

   plugins={{
     selectImage: {
       handleUpload,
       unsplash: {
         accessKey: 'UNPLASH_API_KEY'
       }
     },
     gpt: {query: submitPrompt}
   }}

 />
</EditorTheme>