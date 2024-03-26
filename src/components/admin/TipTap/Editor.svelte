<script>
import { onMount } from 'svelte';
import { createEditor, EditorContent, FloatingMenu, BubbleMenu } from 'svelte-tiptap';
import { Extension } from '@tiptap/core';

// tiptap extensions
import Typography from '@tiptap/extension-typography'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown';
import { Underline } from '@tiptap/extension-underline';
// import Image from '@tiptap/extension-image';
import { CustomImage } from './CustomImageExtension.js';


import MenuItems from "./Menu.svelte";

export let content, meta, slug;

let editor;
let modified = false;

// Assuming slug is available
let customImageExtension = CustomImage.configure({
  slug: slug, // Pass slug to the custom image extension
});


let markdownConfig = {
  html: true,                  // Allow HTML input/output
  tightLists: true,            // No <p> inside <li> in markdown output
  tightListClass: 'tight',     // Add class to <ul> allowing you to remove <p> margins when tight
  bulletListMarker: '-',       // <li> prefix in markdown output
  linkify: false,              // Create links from "https://..." text
  breaks: true,               // New lines (\n) in markdown input are converted to <br>
  transformPastedText: true,  // Allow to paste markdown text in the editor
  transformCopiedText: true,  // Copied text is transformed to markdown
};

onMount(() => {
  editor = createEditor({
    content: content,
    extensions: [
      Underline,
      StarterKit,
      Markdown.configure(markdownConfig),
      Typography,
      customImageExtension,
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-lg focus:outline-none !max-w-none',
      },
    },
    onUpdate({ editor }) { modified = true; },
  });
});

function saveArticle() {
  content = editor.storage.markdown.getMarkdown()
  fetch(`/api/article`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Credentials': 'include'
    },
    body: JSON.stringify({ slug, content, meta}),
  })
  .then(response => {
    console.log('Article updated successfully.');
    modified = false;
  })
  .catch(error => { console.error('Error updating article:', error) });
}


</script>

{#if editor}
  <!-- floating menu is for a blank line  -->
  <FloatingMenu editor={$editor}><MenuItems editor={$editor} mtype="float" /></FloatingMenu>

  <EditorContent editor={$editor}  />

  <!-- Bubble menu is for a selection  -->
  <!-- <BubbleMenu editor={$editor}><MenuItems editor={$editor} mtype="bubble" /></BubbleMenu> -->
{/if}




<style>
  :global(ul.tight li > p:first-child) {
     display: inline;
  }
</style>

