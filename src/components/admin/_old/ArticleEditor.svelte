<script>

	import { Carta, CartaEditor } from 'carta-md';
	import { attachment } from '@cartamd/plugin-attachment';
	// import { emoji } from '@cartamd/plugin-emoji';
	import { slash } from '@cartamd/plugin-slash';
	// import { code } from '@cartamd/plugin-code';
	// import 'carta-md/dark.css';
	// import './githubEditor.scss';

  import { onMount } from 'svelte';

	const carta = new Carta({
		extensions: [
			attachment({
				async upload() {
					return 'some-url-from-server.xyz';
				}
			}),
			// emoji(),
			slash(),
			// code()
		]
	});

  export let slug;
  export let value = "initial value";

  $:value = content;

  let content = "";
  let meta = {};

  onMount(async () => {
    loadArticle(slug);
  });


  async function loadArticle(slug) {
    try {
      const response = await fetch(`/api/article?slug=${slug}`);
      if (response.ok) {
        const data = await response.json();
        content =  data.body.trim();
        meta = data.meta; // we're not using this yet, but it seemed like a good idea
        // console.log('loaded article: ', content);
      } else {
        const errorBody = await response.json();
        console.error("Failed to load article. Status code: ", response.status, errorBody);
      }
    } catch (error) {
      console.error("Error loading article:", error);
    }
  }

</script>

<CartaEditor bind:value mode="tabs" theme="github" {carta}/>


<style>

</style>


