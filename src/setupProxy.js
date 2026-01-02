// Disable error overlay
module.exports = function(app) {
  // This will be picked up by webpack dev server
};

// Disable error overlay via webpack
if (process.env.NODE_ENV === 'development') {
  const disableOverlay = () => {
    const iframe = document.querySelector('iframe[src*="webpack"]');
    if (iframe) {
      iframe.style.display = 'none';
    }
  };
  
  if (typeof window !== 'undefined') {
    window.addEventListener('load', disableOverlay);
    setInterval(disableOverlay, 100);
  }
}
