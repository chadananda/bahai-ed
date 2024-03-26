function loadPlyrScript() {
  return new Promise((resolve, reject) => {
    if (window.Plyr) {
      resolve();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdn.plyr.io/3.6.8/plyr.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Plyr script'));
      document.head.appendChild(script);
    }
  });
}

function initializePlyr(plyrId, imageUrl) {
  //console.log('Initializing Plyr for:', plyrId);
  loadPlyrScript().then(() => {
    if (window.Plyr) {
 //console.log('found player element:', plyrId);
      const player = new window.Plyr(`#${plyrId}`, {
        // Plyr options - customize as needed
        controls: [
          'play-large', // The large play button in the center
          'restart', // Restart playback
          'rewind', // Rewind by the seek time (default 10 seconds)
          'play', // Play/pause playback
          'fast-forward', // Fast forward by the seek time (default 10 seconds)
          'progress', // The progress bar and scrubber for playback and buffering
          'current-time', // The current time of playback
          'duration', // The full duration of the media
          'mute', // Toggle mute
          'volume', // Volume control
          'captions', // Toggle captions
          'settings', // Settings menu
          'pip', // Picture-in-picture (currently Safari only)
          'airplay', // Airplay (currently Safari only)
          'download', // Show a download button with a link to either the current source or a custom URL you specify in your options
          'fullscreen', // Toggle fullscreen
        ],
        // Additional options can be added here
      });

      // Handle podcast image
      if (imageUrl) {
        const plyrContainer = document.getElementById(plyrId);
        const podcastImage = document.createElement('img');
        podcastImage.src = imageUrl;
        podcastImage.style = 'width: 30%; float: left; margin-right: 20px;';
        plyrContainer.parentNode.insertBefore(podcastImage, plyrContainer);
      }

    } else {
      console.error('Plyr not defined after script load');
    }
  }).catch(error => {
    console.error('Error loading Plyr:', error);
  });
}

window.initializePlyr = initializePlyr; // Expose the function to global scope
