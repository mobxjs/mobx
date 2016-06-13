var test = require('tape');
var m = require('..');

test('autorun 1', function(t) {
	var _fired = 0;
	var _result = null;
	var _cCalcs = 0;
	var to = setTimeout;
	
	function expect(fired, cCalcs, result) {
		t.equal(_fired, fired, "autorun fired");
		t.equal(_cCalcs, cCalcs, "'c' fired");
		if (fired)
			t.equal(_result, result, "result");
		_fired = 0;
		_cCalcs = 0;
	}
	
	var a = m.observable(2);
	var b = m.observable(3);
	var c = m.observable(function() {
		_cCalcs++;
		return a.get() * b.get();
	});
	var d = m.observable(1);
	var autorun = function() {
		_fired++;
		_result = d.get() > 0 ? a.get() * c.get() : d.get();
	};
	var disp = m.autorunAsync(autorun, 20);
	
	expect(0, 0, null);
	disp();
	to(function() {
		expect(0, 0, null);
		disp = m.autorunAsync(autorun, 20);
		
		to(function() {
			expect(1, 1, 12);
			a.set(4);
			b.set(5);
			a.set(6);
			expect(0, 3, null);
			to(function() {
				expect(1, 0, 180); // c() is cached, not refired since previous expect
				d.set(2);
				
				to(function() {
					expect(1, 0, 180);
					
					d.set(-2);
					to(function() {
						expect(1, 0, -2);
						
						a.set(7);
						to(function() {
							expect(0, 0, 0); // change a has no effect

							a.set(4);
							b.set(2);
							d.set(2)
							
							to(function() {
								expect(1, 1, 32);
								
								disp();
								a.set(1);
								b.set(2);
								d.set(4);
								to(function() {
									expect(0, 0, 0);
									t.end();
								},30)
							}, 30);
						}, 30);
					}, 30);
				}, 30);
			}, 30);			
		}, 30);
	}, 30);
});

test('autorun should not result in loop', function(t) {
	var i = 0;
	var a = m.observable({
		x: i
	});

	var autoRunsCalled = 0;
	var d = m.autorunAsync("named async", function() {
		autoRunsCalled++;
		a.x = ++i;
		setTimeout(function() {
			a.x = ++i;
		}, 10);
	}, 10);
	
	setTimeout(function() {
		t.equal(autoRunsCalled, 1);
		t.end();

		t.equal(d.$mobx.name, "named async");
		d();
	}, 100);
});