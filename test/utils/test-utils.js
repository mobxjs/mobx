"use strict";

exports.consoleError = function(t, block, regex) {
	let messages = "";
	const orig = console.error;
	console.error = function() {
		Object.keys(arguments).forEach(key => {
			messages += ", " + arguments[key];
		})
		messages += "\n";
	}
	try {
		block();
	} finally {
		console.error = orig;
	}
	if (!messages)
		t.ok(false, "Expected error, but nothing was logged");
	else if (regex.test(messages))
		t.ok(true, "console.error");
	else
		t.ok(false, "Expected " + regex +  ", got: " + messages);
}

// TODO: move check globalState, cleanSpyEvents to here.