var test = require('tape');
var mobx = require('..');
var observable = mobx.observable;
var toJS = mobx.toJS;

test('toJS should ignore HTMLElement', function(t) {
	if (typeof document !== 'object') {
		return t.end();
	}

	var image = observable(document.createElement('img'));

	try {
		toJS(image);
	} catch (err) {
		t.error(err);
	}

	t.end();
})
