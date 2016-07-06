var test = require('tape');
var mobx = require('..');

test('spy output', t => {
	var events = [];
	
	var stop = mobx.spy(c => events.push(c));
	
	doStuff();
	
	stop();
	
	doStuff();	

	events.forEach(ev => { delete ev.object; delete ev.fn; delete ev.time; });
	
	t.equal(events.length, doStuffEvents.length, "amount of events doesn't match");
	//t.deepEqual(events, doStuffEvents);

	events.forEach((ev, idx) => {
		t.deepEqual(ev, doStuffEvents[idx], "expected event #" + (1 + idx) + " to be equal");
	});

	t.ok(events.filter(ev => ev.spyReportStart === true).length > 0, "spy report start count should be larger then zero");

	t.equal(
		events.filter(ev => ev.spyReportStart === true).length,
		events.filter(ev => ev.spyReportEnd === true).length,
		"amount of start and end events differs"
	);

	t.end();
})

function doStuff() {
	var a = mobx.observable(2);
	a.set(3);
	
	var b = mobx.observable({
		c: 4
	});
	b.c = 5;
	mobx.extendObservable(b, { d: 6 });
	b.d =  7;

	var e = mobx.observable([1, 2]);
	e.push(3, 4);
	e.shift();
	e[2] = 5;
	
	var f = mobx.map({ g: 1 });
	f.delete("h");
	f.delete("g");
	f.set("i", 5);
	f.set("i", 6);
	
	var j = mobx.computed(() => a.get() * 2);
	
	var stop = mobx.autorun(() => { j.get() });
	
	a.set(4);
	
	mobx.transaction(function myTransaction() {
		a.set(5);
		a.set(6);
	});
	
	mobx.action("myTestAction", (newValue) => {
		a.set(newValue)
	})(7);
}







const doStuffEvents = [
	{ newValue: 2, type: 'create' },
	{ newValue: 3, oldValue: 2, type: 'update', spyReportStart: true },
	{ spyReportEnd: true },
	{ name: 'c', newValue: 4, spyReportStart: true, type: 'add' },
	{ spyReportEnd: true },
	{ name: 'c', newValue: 5, oldValue: 4, spyReportStart: true, type: 'update' },
	{ spyReportEnd: true },
	{ name: 'd', newValue: 6, spyReportStart: true, type: 'add' },
	{ spyReportEnd: true },
	{ name: 'd', newValue: 7, oldValue: 6, spyReportStart: true, type: 'update' },
	{ spyReportEnd: true },
	{ added: [ 1, 2 ], addedCount: 2, index: 0, removed: [], removedCount: 0, spyReportStart: true, type: 'splice' },
	{ spyReportEnd: true },
	{ added: [ 3, 4 ], addedCount: 2, index: 2, removed: [], removedCount: 0, spyReportStart: true, type: 'splice' },
	{ spyReportEnd: true },
	{ added: [], addedCount: 0, index: 0, removed: [ 1 ], removedCount: 1, spyReportStart: true, type: 'splice' },
	{ spyReportEnd: true },
	{ index: 2, newValue: 5, oldValue: 4, spyReportStart: true, type: 'update' },
	{ spyReportEnd: true },
	{ name: 'g', newValue: 1, spyReportStart: true, type: 'add' },
	{ spyReportEnd: true },
	{ name: 'g', oldValue: 1, spyReportStart: true, type: 'delete' },
	{ spyReportEnd: true },
	{ name: 'i', newValue: 5, spyReportStart: true, type: 'add' },
	{ spyReportEnd: true },
	{ name: 'i', newValue: 6, oldValue: 5, spyReportStart: true, type: 'update' },
	{ spyReportEnd: true },
	{ spyReportStart: true, type: 'reaction' },
	{ target: undefined, type: 'compute' },
	{ spyReportEnd: true },
	{ newValue: 4, oldValue: 3, spyReportStart: true, type: 'update' },
	{ target: undefined, type: 'compute' },
	{ spyReportStart: true, type: 'reaction' },
	{ spyReportEnd: true },
	{ spyReportEnd: true },
	{ name: 'myTransaction', spyReportStart: true, target: undefined, type: 'transaction' },
	{ newValue: 5, oldValue: 4, spyReportStart: true, type: 'update' },
	{ spyReportEnd: true },
	{ newValue: 6, oldValue: 5, spyReportStart: true, type: 'update' },
	{ spyReportEnd: true },
	{ target: undefined, type: 'compute' },
	{ spyReportStart: true, type: 'reaction' },
	{ spyReportEnd: true },
	{ spyReportEnd: true },
	{ name: 'myTestAction', spyReportStart: true, arguments: [7], type: 'action', target: undefined },
	{ newValue: 7, oldValue: 6, spyReportStart: true, type: 'update' },
	{ spyReportEnd: true },
	{ target: undefined, type: 'compute' },
	{ spyReportStart: true, type: 'reaction' },
	{ spyReportEnd: true },
	{ spyReportEnd: true }
]