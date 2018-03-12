
var cheerio = require('cheerio');
var _ = require('underscore');

// insert anchor link into section
var insertAnchors = function(section) {
    
    var $ = cheerio.load(section.content);
    
    $(':header').each(function(i, elem) {
	var header = $(elem);
	var id = header.attr('id');
	header.prepend('<a name="' + id + '" class="plugin-anchor" ' 
		       + 'href="#' + id + '">' 
		       + '<span class="fa fa-link"></span>'
		       + '</a>');
    });
    section.content = $.html();
};

module.exports = {
    book: {
        assets: ".",
        css: [ "plugin.css" ]
    },
    hooks: {
        "page": function(page) { // before html generation
	    
	    sections = _.select(page.sections, function(section) {
		return section.type == 'normal';
	    }); // pluck all normal sections -- as opposed to exercises?

	    _.forEach(sections, insertAnchors);

            return page;
        }
    }
};
