<script>
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { faImage, faListUl } from '@fortawesome/free-solid-svg-icons';

 export let editor
 export let mtype;

 // Function to check if a format is active
 function isActive(format, options = {}) {
   return editor ? editor.isActive(format, options) : false;
 }
</script>

{#if !!editor && mtype==="bubble"}
<!-- bubble menu is for a selection, should have text formatting options  -->
<div class="bubble-menu">
  <button on:click={() => editor.chain().focus().toggleBold().run()}
    class:is-active={isActive('bold')}> <b>B</b>
  </button>
  <button on:click={() => editor.chain().focus().toggleItalic().run()}
    class:is-active={isActive('italic')}> <i>I</i>
  </button>
  <button on:click={() => editor.chain().focus().toggleUnderline().run()}
    class:is-active={isActive('underline')}> <u>U</u>
  </button>
  <button on:click={() => editor.chain().focus().toggleStrike().run()}
   class:is-active={isActive('strike')}> <s>S</s>
  </button>
 </div>
{/if}

{#if !!editor && mtype==="float"}
<!-- floating menu is for a blank line  -->
<div class="float-menu">
 <button on:click={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
   class:is-active={isActive('heading', { level: 2 })}> <b>H2</b>
 </button>
 <button on:click={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
   class:is-active={isActive('heading', { level: 3 })}> <b>H3</b>
 </button>
 <button on:click={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
   class:is-active={isActive('heading', { level: 4 })}> <b>H4</b>
 </button>
 <button
  on:click={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
  class:is-active={isActive('heading', { level: 4 })}> <FontAwesomeIcon icon={faImage} />
 </button>
 <button on:click={() => editor.chain().focus().toggleBulletList().run()}
   class:is-active={isActive('bulletList')}><FontAwesomeIcon icon={faListUl} />
 </button>
</div>
{/if}


<style>
 .bubble-menu {
   background-color: white;
   padding: 0.5rem;
 }
 .bubble-menu button {
   border: 1px solid #e2e8f0;
   padding: 0 .5rem;
   margin: 0.01rem;
   border-radius: 0.25rem;
   background-color: #f8f8f8;
   color: #4a5568;
   font-family: 'Courier New', monospace;
    font-size: 1.25rem;
   }
   .bubble-menu button:hover, .bubble-menu button.is-active {
      background-color: #e2e8f0;
    }


 .float-menu {
   background-color: white;
   padding: 0.5rem;
 }
 .float-menu button {
   border: 1px solid #e2e8f0;
   padding: 0 .5rem;
   margin: 0.01rem;
   border-radius: 0.25rem;
   background-color: #f8f8f8;
   color: #4a5568;
   font-family: 'Courier New', monospace;
    font-size: 1.25rem;
   }
   .float-menu button:hover, .float-menu button.is-active {
      background-color: #e2e8f0;
    }
</style>