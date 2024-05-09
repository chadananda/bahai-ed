<!-- src/components/admin/ArticleText.svelte -->
<script>
    // import { lucia } from "@lib/auth";
 // this editor needs two API endpoints:
 //  1.  /api/save-article/:slug -- posts the article to the server
 //  2.  /api/upload-image -- posts the image to the server
 //  import 'https://unpkg.com/easymde/dist/easymde.min.css';

 import { onMount, tick } from 'svelte';
  // Declare article and slug as props
//  export let article;
//  export let meta;
//  export let slug;
 export let post, sessionid, visible;

//  $: post = {...post};

//  console.log('Editor audio: ', {audio: post?.data?.audio, audio_image: post?.data?.audio_image });

 let EasyMDE;
 let easyMDEInstance;
 let textArea;
 let hasUnsavedChanges = false;
 let content = '';

  // Reactive statement to update the save button
 $: if (easyMDEInstance) updateSaveButton(hasUnsavedChanges);

 $: if (visible && easyMDEInstance && post) {
    // Ensure the update happens after Svelte has updated the DOM
    tick().then(() => {  easyMDEInstance.value( post.body ) });
}

function genPostID(title) {
  const stopWords = 'a the and or of in on at to for with by'.split(' '); // add common words to exclude from slug
  if (language!='en') return console.error('updatePost_DB: completely new post must be in English');
  let namePart = slugify(title).split('-').filter(w => !stopWords.includes(w)).slice(0, 4).join('-');
  let datePart = (new Date()).toLocaleDateString('en-CA'); // YYYY-MM-DD
  return `${datePart}-${namePart}/${language}.md`;
}

function updateSaveButton(unsavedChanges) {
  const saveButton = document.querySelector('.fa-save');
  if (saveButton) {
    saveButton.style.color = unsavedChanges ? 'green' : 'silver'; // Explicitly setting to 'inherit' when there are no
    saveButton.style.fontSize = unsavedChanges ? '24px' : '14px'; // unsaved changes
    saveButton.style.fontWeight = unsavedChanges ? 'bold' : 'inherit'; // unsaved changes
  }
}

function addCSS() {
  const link = document.createElement('link');
  link.href = 'https://unpkg.com/easymde/dist/easymde.min.css';
  link.type = 'text/css';
  link.rel = 'stylesheet';
  document.head.appendChild(link);
}

onMount(async () => {
  if (typeof window !== 'undefined') {
    addCSS();
    // Dynamically import EasyMDE when on the client-side
    const EasyMDEModule = await import('easymde');
    EasyMDE = EasyMDEModule.default;
    easyMDEInstance = new EasyMDE({
      element: textArea,
      spellChecker: false,
      initialValue: post.body,// article.trim(),
      toolbar: [
      'bold', 'italic', 'heading', '|',
      'code', 'quote', 'unordered-list', 'ordered-list', '|',
      'link', 'image', 'table', '|',
      'preview', 'side-by-side', 'fullscreen',
      {
        name: "upload-image",
        action: function(editor) {
          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.accept = 'image/*';
          fileInput.onchange = e => {
            const file = e.target.files[0];
            if (file) uploadImage(file, editor);
          };
          fileInput.click();
        },
        className: "fa fa-picture-o",
        title: "Upload Image",
      },
      '||', '||',
        {
          name: 'save',
          action: saveArticle,
          className: 'fa fa-save ml-auto', // Use a Font Awesome save icon
          title: 'Save Article',
        },
      ],
    });

    easyMDEInstance.codemirror.on('change', () => {
      hasUnsavedChanges = true;
    });

    // Add Ctrl+S functionality
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveArticle(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); };
  }
});

async function loadArticle(slug) {
  try {
    // const post = await

    // const response = await fetch(`/api/article?slug=${slug}`);
    // if (response.ok) {
    //   const data = await response.json();
    //   content = data.body.trim();
    //   meta = data.meta; // we're not using this yet, but it seemed like a good idea
    //   return content;
    // } else {
    //   const errorBody = await response.json();
    //   console.error("Failed to load article. Status code: ", response.status, errorBody);
    // }
  } catch (error) {
    console.error("Error loading article:", error);
  }
}

async function uploadImage(file, editor) {
  const formData = new FormData();
  formData.append('image', file); // 'image' is the key your server expects for the file

  try {
    const response = await fetch('/api/upload-s3', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    if (data.url) {
      const markdownImage = `![](${data.url})`;
      editor.codemirror.replaceSelection(markdownImage);
    } else {
      throw new Error('No URL in response');
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    alert('Error uploading image. Please try again.');
  }
}

async function saveArticle() {
  const saveButton = document.querySelector('.fa-save');
  if (saveButton) {
    saveButton.style.color = 'gray';
    saveButton.style.fontSize = '14px';
  }
  content = easyMDEInstance.value().trim();
  try {
    post.body = content;
    const response = await fetch(`/api/article`, { // Adjusted to match your API endpoint
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post, sessionid }), // Include slug, meta, and content
    });
    if (response.ok) {
      let data = await response.json();
      console.log("Article saved successfully: ", data);
      hasUnsavedChanges = false;
    } else {
      const errorBody = await response.json();
      console.error("Failed to save article. Status code: ", response.status, errorBody);
    }
  } catch (error) {
    console.error("Error saving article:", error);
  } finally {
    updateSaveButton(hasUnsavedChanges);
  }
}

const updatePostAPI = async (post, sessionid) => {
  try {
    const response = await fetch(`/api/article`, { // Adjusted to match your API endpoint
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post, sessionid }), // Include slug, meta, and content
    });
    if (response.ok) {
      let data = await response.json();
      console.log("Article saved successfully: ", data);
      return true
    } else {
      const errorBody = await response.json();
      console.error("Failed to save article. Status code: ", response.status, errorBody);
      return false
    }
  } catch (error) {
    console.error("Error saving article:", error);
    return false
  }
}


</script>

<div class={`w-full relative p-2 ${visible ? 'block': 'hidden' } `}>
  <textarea class="relative" bind:this={textArea}></textarea>
</div>




<style>
  @import 'https://unpkg.com/easymde/dist/easymde.min.css';

  /* Example of aligning the save button to the right */
  :global(.EasyMDEContainer .editor-toolbar) {
    display: flex;
    justify-content: space-between;
  }

  :global(.EasyMDEContainer .editor-toolbar .fa-save) {
    margin-left: auto;
    color: gray;
  }

  :global(.EasyMDEContainer .editor-toolbar:not(.fullscreen)) {
    position: sticky !important;
    top: 57px !important;
    background-color: white;
    z-index: 9999 !important;
    border-bottom: 1px solid silver;
  }

  :global(.EasyMDEContainer .editor-toolbar.fullscreen) {
    position: fixed !important;
    top: 5px !important;
    width: 100%;
    z-index: 9999 !important;
  }

  :global(.EasyMDEContainer .CodeMirror-fullscreen) {
    top: 55px !important; /* Adjust based on your toolbar's height */
    left: 0px !important; /* Adjust based on your toolbar's width */
    z-index: 9999 !important; /* Ensure this is higher than your toolbar's z-index */
  }
  :global(.editor-toolbar) {
    z-index: 9999 !important; /* Ensure it's above other content */
    position: relative; /* If not already positioned */
  }

  :global(.CodeMirror) {
    /* font-family: 'Fira Code', 'Monaco', 'Menlo', 'Consolas', 'Courier New', monospace !important; */
    /* font-family: 'Fira Code', 'Monaco', 'Menlo', 'Consolas', 'Courier New', monospace !important; */
    font-size: 16px !important; /* Or any size you prefer */
    line-height: 1.5 !important; /* Adjust line height for better readability */
  }

  :global(.editor-toolbar) {
    font-size: 14px; /* Adjust based on your preference */
  }

  :global(.EasyMDEContainer .cm-formatting-header) {
    color: #AAA !important; /* Adjust based on your preference */
  }


</style>
