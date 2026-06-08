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

function slugify(value) {
    return value
        .toLowerCase()
        .replace(/`/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function assignLinkableTabIds() {
    var tabs = document.querySelectorAll('.nav-link[data-group][data-tab]');
    var assigned = {};

    for (var tab of tabs) {
        var id = slugify(tab.textContent);
        if (!id) {
            continue;
        }

        var uniqueId = id;
        var suffix = 2;
        while (assigned[uniqueId] || document.getElementById(uniqueId)) {
            uniqueId = id + '-' + suffix++;
        }

        assigned[uniqueId] = true;
        tab.id = uniqueId;
    }
}

function activateTab(tab) {
    var groupId = tab.getAttribute('data-group');
    var contentId = tab.getAttribute('data-tab');

    for (var groupTab of document.querySelectorAll(".nav-link[data-group='" + groupId + "']")) {
        groupTab.classList.remove('active');
    }

    for (var pane of document.querySelectorAll(".tab-pane[data-group='" + groupId + "']")) {
        pane.classList.remove('active');
    }

    tab.classList.add('active');

    var content = document.getElementById(contentId);
    if (content) {
        content.classList.add('active');
    }
}

function openLinkedTab() {
    var hash = location.hash.substring(1);
    if (!hash) {
        return false;
    }

    var tab = document.getElementById(hash);
    if (!tab || !tab.matches('.nav-link[data-group][data-tab]')) {
        return false;
    }

    activateTab(tab);
    setTimeout(function() {
        tab.scrollIntoView();
    }, 150);
    return true;
}

function addHashToTabClicks() {
    var tabs = document.querySelectorAll('.nav-link[data-group][data-tab]');

    for (var tab of tabs) {
        tab.addEventListener('click', function(e) {
            if (e.currentTarget.id) {
                location.hash = e.currentTarget.id;
            }
        });
    }
}

function addTooltipToRockets() {
    var classNames = ['navGroups', 'onPageNav', 'post', 'docs-prevnext'];
    var rocketRegex = /🚀/g;

    for (var className of classNames) {
        var els = document.getElementsByClassName(className);
        for (var el of els) {
            el.innerHTML = el.innerHTML.replace(rocketRegex, '<span title="Advanced feature">🚀</span>');
        }
    }
}
window.addEventListener('hashchange', function() {
    if (!openLinkedTab()) {
        openTarget();
    }
});
window.addEventListener('DOMContentLoaded', function() {
    addTooltipToRockets();
    assignLinkableTabIds();
    addHashToTabClicks();
    if (!openLinkedTab()) {
        openTarget();
    }
});
