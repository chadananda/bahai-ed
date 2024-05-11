<script>
// svelte client-side editing functionality
// this component is responsible for editing all aspects of a post, not just markdown

import Editor from './easymde/Editor.svelte'; // markdown editor
import MetaEditor from './MetaEditor.svelte'; // meta data editor
import Preview from './Preview.svelte'; // preview component
import TabSwitcher from './TabSwitcher.svelte';
import LanguageSwitcher from './LanguageSwitcher.svelte';

export let site;
export let authorList;
export let topicList;
export let categoryList;
export let languages;
export let language;
export let sessionid;
export let translations;

const articleExists = (lang) => translations.filter(t => t.data?.language === lang).length > 0;
$: languages = languages.map(lang => ({...lang, enabled: articleExists(lang.id)}));
// sort language list by active (language===id), then enabled, then id
languages.sort((a, b) => a.id === language ? -1 : b.id === language ? 1 : a.enabled === b.enabled ? a.id.localeCompare(b.id) : b.enabled - a.enabled);


let activeTab = 'content'; // Default to showing the content editor
const tabs = [
  { id: 'content', title: 'Content' },
  { id: 'metadata', title: 'Details' },
  { id: 'preview', title: 'Preview' }
];

function handleTabSwitch(event) { activeTab = event.detail.tabId; }

let selectedLanguage;
let post;


// Simulated function to switch content based on language
function loadContent(lang) {
  //console.log('loading content:', lang);
  selectedLanguage = lang;
  post = null; // Reset post to ensure reactivity
  const newPost = translations.find(t => t.data?.language === selectedLanguage); // Use find instead of filter[0]
  if (newPost) {
    post = { ...newPost }; // Create a new object to ensure reactivity
  }
}

// when selected language change, reload content
$: { loadContent(language); }

let meta_props = {
  sessionid,
  authors: authorList,
  site,
  topics: topicList,
  categories: categoryList,
};
</script>



<div class="editor p-0 w-full h-auto my-4 ml-6 -mt-5">
  <h3 class="text-xl mx-2 font-semibold ml-2 inline -mt-4"> {post?.data?.title} </h3>
  <div class="grid grid-cols-[repeat(4,minmax(0,1fr))_auto] gap-1">
    <div class="col-span-4">
      <TabSwitcher {tabs} {activeTab} on:tabSwitch={handleTabSwitch} />
    </div>
    <div class="col-span-4 min-w-[580px]">
      {#if !!post}
        <!-- {#key language} -->
          <Editor bind:post={post} {sessionid} visible={activeTab === 'content'} />
          <MetaEditor bind:post={post} {...meta_props} visible={activeTab === 'metadata'} />
          <Preview bind:post={post} {...meta_props} visible={activeTab === 'preview'} />
         <!-- {/key} -->
      {/if}
    </div>
    <div class="pt-3">
      <LanguageSwitcher {languages} {language} on:language={({detail}) => language=detail.id } />
    </div>
  </div>
</div>


