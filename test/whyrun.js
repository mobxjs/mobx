"use strict"

const test = require('tape');
const mobx = require('../');
const noop = () => {};

test("whyrun", t => {
	const baselog = console.log;
	let lastButOneLine = "";
	let lastLine = "";

	const whyRun = function () {
		lastButOneLine = lastLine;
		console.log = noop;
		lastLine = mobx.whyRun.apply(null, arguments);
		console.log = baselog;
		return lastLine;
	}

	const x = mobx.observable({
		firstname: "Michel",
		lastname: "Weststrate",
		fullname: function() {
			var res = this.firstname + " " + this.lastname;
			whyRun();
			return res;
		}
	});

	x.fullname;
	t.ok(lastLine.match(/suspended/), "just accessed fullname"); // no normal report, just a notification that nothing is being derived atm

	t.ok(whyRun(x, "fullname").match(/\[idle\]/));
	t.ok(whyRun(x, "fullname").match(/suspended/));

	const d = mobx.autorun("loggerzz", () => {
		x.fullname;
		whyRun();
	})

	t.ok(lastButOneLine.match(/\[started\]/), "created autorun");
	t.ok(lastButOneLine.match(/will re-run/));
	t.ok(lastButOneLine.match(/\.firstname/));
	t.ok(lastButOneLine.match(/\.lastname/));
	t.ok(lastButOneLine.match(/loggerzz/));

	t.ok(lastLine.match(/\[running\]/));
	t.ok(lastLine.match(/\.fullname/));

	t.ok(whyRun(x, "fullname").match(/\[idle\]/));
	t.ok(whyRun(x, "fullname").match(/\.firstname/));
	t.ok(whyRun(x, "fullname").match(/\.lastname/));
	t.ok(whyRun(x, "fullname").match(/loggerzz/));

	t.ok(whyRun(d).match(/\[idle\]/));
	t.ok(whyRun(d).match(/\.fullname/));

	t.ok(whyRun(d).match(/loggerzz/));

	mobx.transaction(() => {
		x.firstname = "Veria";
		t.ok(whyRun(x, "fullname").match(/\[idle\]/), "made change in transaction");
		t.ok(whyRun(x, "fullname").match(/next run is scheduled/));

		t.ok(whyRun(d).match(/\[scheduled\]/));
	})

	t.ok(lastButOneLine.match(/\[invalidated\]/),"post transaction");
	t.ok(lastButOneLine.match(/will re-run/));
	t.ok(lastButOneLine.match(/\.firstname/));
	t.ok(lastButOneLine.match(/\.lastname/));
	t.ok(lastButOneLine.match(/\loggerzz/));

	t.ok(lastLine.match(/\[running\]/));
	t.ok(lastLine.match(/\.fullname/));

	t.ok(whyRun(x, "fullname").match(/\[idle\]/));
	t.ok(whyRun(x, "fullname").match(/\.firstname/));
	t.ok(whyRun(x, "fullname").match(/\.lastname/));
	t.ok(whyRun(x, "fullname").match(/loggerzz/));

	t.ok(whyRun(d).match(/\[idle\]/));
	t.ok(whyRun(d).match(/\.fullname/));
	t.ok(whyRun(d).match(/loggerzz/));

	d();

	t.ok(whyRun(d).match(/\[stopped\]/));
	t.ok(whyRun(x, "fullname").match(/\[idle\]/));
	t.ok(whyRun(x, "fullname").match(/suspended/));

	t.end();
})
