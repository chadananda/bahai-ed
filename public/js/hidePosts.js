// This function will update the visibility based on the selected language
function updateArticleVisibility() {
//console.log('updateArticleVisibility');
 const selectedLanguage = localStorage.getItem('selectedLanguage') || 'en';
 const articles = document.querySelectorAll('.articlePost');
 articles.forEach(article => {
   const language = article.dataset.language.toLowerCase();
   if (language === selectedLanguage) {
     article.classList.remove('hidden');
   } else {
     article.classList.add('hidden');
   }
 });
}

// Call the function immediately and then at specified intervals
//console.log('Calling update post visibility');
updateArticleVisibility(); // Initial call
setTimeout(updateArticleVisibility, 250);  // Call after 1/4 second
setTimeout(updateArticleVisibility, 1000); // Call after 1 second
setTimeout(updateArticleVisibility, 2000); // Call after 2 seconds
