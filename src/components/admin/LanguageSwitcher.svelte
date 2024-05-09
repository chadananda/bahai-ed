<script>
 import { createEventDispatcher } from 'svelte';
 export let languages = [];
 export let language = 'en';
 const dispatch = createEventDispatcher();

 function selectLanguage(lang) {
   language = lang;
   dispatch('language', lang);
 }
</script>


<div class="md:flex">
 <ul class="flex flex-col space-y-2 text-sm font-medium text-gray-500 md:mr-4 mb-4 md:mb-0">
   {#each languages as lang}
     <li on:click={() => selectLanguage(lang)}
        class="{language === lang.id ? 'active' : ''} {lang.enabled ? '' : 'disabled'} rounded-lg">
       <a href="#" class="{(language === lang.id ? 'active ' : '') + (!lang.enabled ? 'disabled ' : '')} inline-flex items-center px-4 py-2 rounded-lg hover:text-gray-900 bg-gray-50 hover:bg-gray-100 w-full">
         <span class="flag">{lang.flag}</span>
         <span class="hidden md:inline ml-2 lg:hidden">{lang.id}</span>
         <span class="hidden lg:inline ml-2">{lang.en_name}</span>
       </a>
     </li>
   {/each}
 </ul>
</div>


<style>
  .flag { font-size: 24px; }
  .active {
    background-color: #6381d4; /* Blue background for active */
    color: #FFFFFF; /* White text */
  }
  .disabled {
    background-color: #E5E7EB; /* Gray background for disabled */
    color: #9CA3AF; /* Gray text */
    cursor: not-allowed;
    pointer-events: none; /* Disable click events */
  }
  .disabled .flag {
    opacity: 0.5; /* Reduce opacity for flags in disabled items */
  }
</style>

