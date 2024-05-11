<script>
  import { marked } from 'marked';

  export let post, visible;

  // Custom renderer
  const renderer = new marked.Renderer();

  // Customize image rendering
  renderer.image = (href, title, text) => `<img src="${href}" alt="${text}" class="mx-auto" title="${title || ''}" style="max-width: 100%; display: block;">`;

  // Customize link rendering to include images
  renderer.link = (href, title, text) => text.match(/<img.*?src=".+?".*?>/i) ?
    `<a href="${href}" title="${title || ''}">${text}</a>` :
    `<a href="${href}" title="${title || ''}">${text}</a>`;

  // Set the options
  marked.setOptions({
    renderer,
    gfm: true,
    breaks: true,
    sanitize: false, // Note: Disabling sanitization can introduce security risks if the content is untrusted.
  });

  // Custom parsing function that handles Markdown inside HTML
  function customMarkdownParser(markdown) {
    const html = marked(markdown);
    const div = document.createElement('div');
    div.innerHTML = html;

    // Process specific tags like <aside> that contain Markdown
    div.querySelectorAll('aside').forEach(aside => {
      aside.innerHTML = marked(aside.textContent);
    });

    return div.innerHTML;
  }

  // Computed HTML content
  let html = post ? customMarkdownParser(post.body) : '';

$: showClass = visible ? 'block' : 'hidden';

  // Watch for changes to the post body
  $: {
    if (post) {
      html = customMarkdownParser(post.body);
    }
  }

</script>


<div class={`markdown-body prose-lg ${showClass}`}>
  {@html html}
</div>


<style>
  :global(.markdown-body aside) {float: right; width: 30%; margin: 0 0 1em 1em; padding: 0.5em;
    border-left: 4px solid #aaf; padding-left: 2em;}
  :global(.markdown-body aside p img) {max-width: 150px;}
</style>


