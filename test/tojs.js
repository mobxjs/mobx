var test = require('tape');
var mobx = require('..');
var observable = mobx.observable;
var toJS = mobx.toJS;

test('toJS should ignore HTMLElement', function(t) {
	if (!process.env.BROWSER) {
		return t.end();
	}

	var image = observable(new Image());

	try {
		toJS(image);
	} catch (err) {
		t.error(err);
	}

	t.end();
})
