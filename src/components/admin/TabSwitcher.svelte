<script>
import { createEventDispatcher } from 'svelte';

// Props
export let tabs = []; // Array of tab objects { id: string, title: string }
export let activeTab = ''; // ID of the active tab

const dispatch = createEventDispatcher();
function switchTab(tabId) {
  dispatch('tabSwitch', { tabId });
}
</script>



<div class="sm:hidden">
 <label for="tabs" class="sr-only">Select view Mode</label>
 <select id="tabs" class="form-select bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" on:change="{(e) => switchTab(e.target.value)}">
   {#each tabs as tab}
     <option value="{tab.id}" selected={tab.id === activeTab}>{tab.title}</option>
   {/each}
 </select>
</div>

<ul class="hidden sm:flex text-sm font-medium text-center text-gray-500 rounded-lg  my-1">
 {#each tabs as tab}
   <li class="w-full mx-1">
     <button on:click="{() => switchTab(tab.id)}"
       class:bg-white={tab.id !== activeTab}
       class:bg-blue-100={tab.id === activeTab}
       class:text-gray-700={tab.id !== activeTab}
       class:text-blue-600={tab.id === activeTab}
       class="tab-button-full focus:outline-none focus:ring-0  focus:ring-blue-300 rounded-lg p-4">
       {tab.title}
     </button>
   </li>
 {/each}
</ul>

<style>
 /* Ensure the button fills the tab space */
 .tab-button-full { width: 100%;   }
</style>
