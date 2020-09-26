function openTarget() {
    var hash = location.hash.substring(1);
    if(hash) var details = document.getElementById(hash);
    if(details && details.tagName.toLowerCase() === 'details') {
        details.open = true;
        // seems to interfere with scroll spy otherwise (which triggers at 100 ms)
        setTimeout(function() {
            details.scrollIntoView();
        }, 150)
    }
  }
  window.addEventListener('hashchange', openTarget);
  window.addEventListener('DOMContentLoaded', function() {
    openTarget();
  });
