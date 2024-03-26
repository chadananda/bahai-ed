function handleExternalLinks() {
  document.querySelectorAll('article p a:not([class])').forEach(link => {
    if (link.hostname !== window.location.hostname || link.href.includes('/link/')) {
      link.target = '_blank';
      if (!link.href.includes('/link/')) {
        link.rel = 'noopener noreferrer';
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', handleExternalLinks);
