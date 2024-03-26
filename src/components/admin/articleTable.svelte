<script>
 export let articles = [];

 let filter = '';
 let sortKey = 'title'; // default sort key
 let sortOrder = 1; // 1 for ascending, -1 for descending

 // Reactive statement to filter and sort articles

 $: displayedArticles = articles
   .filter(article =>
     article.data.title.toLowerCase().includes(filter.toLowerCase()) ||
     article.data.description.toLowerCase().includes(filter.toLowerCase()) ||
     article.data.author.id.toLowerCase().includes(filter.toLowerCase())
   )
   .sort((a, b) => {
     if (a.data[sortKey] < b.data[sortKey]) return -1 * sortOrder;
     if (a.data[sortKey] > b.data[sortKey]) return 1 * sortOrder;
     return 0;
   });

 // Function to change sort order and key
 function sort(column) {
   if (sortKey === column) {
     sortOrder *= -1;
   } else {
     sortKey = column;
     sortOrder = 1;
   }
 }
 function formatDate(date) {
  return new Date(date).toLocaleDateString();
 }
</script>

<input class="p-2 mb-4 border border-gray-300 rounded w-full max-w-screen-xs"
  type="text" bind:value={filter} placeholder="Filter articles..." />



<table>
 <thead>
   <tr>
     <th> </th>
     <th on:click={() => sort('datePublished')}>Date</th>
     <th on:click={() => sort('title')}>Title</th>
     <th on:click={() => sort('description')}>Description</th>
     <th on:click={() => sort('author')}>Author</th>
     <th on:click={() => sort('draft')}>Draft</th>
   </tr>
 </thead>
 <tbody>
   {#each displayedArticles as article}
     <tr>
       <td><img src={article.data.image.src.src} alt={article.data.title} width="300" /></td>
       <td>{formatDate(article.data.datePublished)}</td>
       <td><a class="text-blue-800 underline"
          href={`/admin/edit/${article.slug}`}>{article.data.title}</a> ✏️</td>
       <td>{article.data.description}</td>
       <td><a class="text-blue-800 underline"
          href={`/admin/edit_team/${article.data.author.id}`}>{article.data.author.id}</a> ✏️</td>
       <td>{article.data.draft ? 'Yes' : 'No'}</td>
     </tr>
   {/each}
 </tbody>
</table>

<style>
 table { width: 100%; border-collapse: collapse; }
 th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
 th { cursor: pointer; }
 img { max-width: 100%; height: auto; }
</style>
