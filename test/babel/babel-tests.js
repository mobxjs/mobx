import {
    observable, computed, transaction, asStructure, autorun, extendObservable, 
    default as mobx
} from "../";

class Box {
    @observable uninitialized;
    @observable height = 20;
    @observable sizes = [2];
    @observable someFunc = function () { return 2; };
    @computed get width() {
        return this.height * this.sizes.length * this.someFunc() * (this.uninitialized ? 2 : 1);
    }
}

var box = new Box();

var ar = []

autorun(() => {
    ar.push(box.width);
});

var test = require('tape')

test('babel', function (t) {
  var s = ar.slice()
  t.deepEqual(s, [40])
  box.height = 10
  s = ar.slice()
  t.deepEqual(s, [40, 20])
  box.sizes.push(3, 4)
  s = ar.slice()
  t.deepEqual(s, [40, 20, 60])
  box.someFunc = () => 7
  s = ar.slice()
  t.deepEqual(s, [40, 20, 60, 210])
  box.uninitialized = true
  s = ar.slice()
  t.deepEqual(s, [40, 20, 60, 210, 420])
  t.end()
})

test('babel: parameterized computed decorator', (t) => {
	class TestClass {
		@observable x = 3;
		@observable y = 3;
		@computed({ asStructure: true }) get boxedSum() {
			return { sum: Math.round(this.x) + Math.round(this.y) };
		}
	}
	
	const t1 = new TestClass();
	const changes: { sum: number}[] = [];
	const d = autorun(() => changes.push(t1.boxedSum));
	
	t1.y = 4; // change
	t.equal(changes.length, 2);
	t1.y = 4.2; // no change
	t.equal(changes.length, 2);
	transaction(() => {
		t1.y = 3;
		t1.x = 4;
	}); // no change
	t.equal(changes.length, 2);
	t1.x = 6; // change
	t.equal(changes.length, 3);
	d();
	
	t.deepEqual(changes, [{ sum: 6 }, { sum: 7 }, { sum: 9 }]);
	
	t.end();
});