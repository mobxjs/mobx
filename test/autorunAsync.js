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
		return a() * b();
	});
	var d = m.observable(1);
	var autorun = function() {
		_fired++;
		_result = d() > 0 ? a() * c() : d();
		
	};
	var disp = m.autorunAsync(autorun, 20);
	
	expect(0, 0, null);
	disp();
	to(function() {
		expect(0, 0, null);
		disp = m.autorunAsync(autorun, 20);
		
		to(function() {
			expect(1, 1, 12);
			a(4);
			b(5);
			a(6);
			expect(0, 3, null);
			to(function() {
				expect(1, 0, 180); // c() is cached, not refired since previous expect
				d(2);
				
				to(function() {
					expect(1, 0, 180);
					
					d(-2);
					to(function() {
						expect(1, 0, -2);
						
						a(7);
						to(function() {
							expect(0, 0, 0); // change a has no effect

							a(4);
							b(2);
							d(2)
							
							to(function() {
								expect(1, 1, 32);
								
								disp();
								a(1);
								b(2);
								d(4);
								to(function() {
									expect(0, 0, 0);
									t.end();
								},20)
							}, 20);
						}, 20);
					}, 20);
				}, 30);
			}, 30);			
		}, 30);
	}, 30);
});