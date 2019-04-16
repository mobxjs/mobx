require(["gitbook"], function(gitbook) {
    gitbook.events.bind("page.change", function() {
        $.getScript("https://codefund.app/properties/259/funder.js")
    });
});
