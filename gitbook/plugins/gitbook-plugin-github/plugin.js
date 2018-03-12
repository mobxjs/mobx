require([ 'gitbook' ], function (gitbook) {
  var githubURL;

  function insertGitHubLink() {
    if (githubURL && jQuery('.github-sharing-link').length === 0) {
      jQuery('.book-header > h1').before(
        '<a href="' + githubURL + '" _target="blank" class="btn pull-right github-sharing-link sharing-link" aria-label="GitHub">' +
          '<i class="fa fa-github"></i>' +
        '</a>'
      );
    }
  }

  gitbook.events.bind('start', function (e, config) {
    githubURL = config.github.url;
    insertGitHubLink();
  });

  gitbook.events.bind('page.change', function () {
    insertGitHubLink();
  });
});
