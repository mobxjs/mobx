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
function addTooltipToSideBar() {
    var items = document.getElementsByClassName('navItem');
    for (var item of items) {
        item.innerHTML = item.innerHTML.replace('🚀', '<span title="Advanced feature">🚀</span>');
    }
}
window.addEventListener('hashchange', openTarget);
window.addEventListener('DOMContentLoaded', function() {
    openTarget();
    addTooltipToSideBar();
});
