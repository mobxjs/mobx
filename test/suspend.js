var test = require('tape');
var mobx = require('..');
var suspend = mobx.extras.suspend;
var resume = mobx.extras.resume;

test('should not run reactions when suspended', t => {
  var a = mobx.observable(1);
  var values = [];
  mobx.autorun(r => {
    if (a.get() === 4) r.dispose();
    values.push(a.get());
  });

  a.set(2);
  console.log(Object.keys(mobx));
  suspend();
  a.set(3);
  a.set(4);

  t.deepEqual(values, [1, 2]);

  resume();
  // Note that 3 is skipped since the reaction only gets queued once
  t.deepEqual(values, [1, 2, 4]);

  t.end();
});

test('should capture all changes upon resume', t => {
  var a = mobx.observable([]);
  var values = {};
  mobx.autorun(r => {
    if (a.length === 2) r.dispose();
    values = a.slice();
  });

  suspend();
  a.push(1);
  a.push(2);
  t.deepEqual(values, []);
  resume();

  t.deepEqual(values, [1, 2]);

  t.end();
});

test('object modifications while suspended', t => {
  var a = mobx.observable({
    a: 1,
    b: 2
  });
  var values = {};
  mobx.autorun(r => {
    if (a.c === -3) r.dispose();
    values.a = a.a;
    values.b = a.b;
    values.c = a.c;
  });

  a.a = -1;
  t.deepEqual(values, {
    a: -1,
    b: 2,
    c: undefined
  });
  suspend();
  a.b = -2;
  a.c = -3;
  // Should be unchanged here. Reactions are suspended
  t.deepEqual(values, {
    a: -1,
    b: 2,
    c: undefined
  });
  resume();

  t.deepEqual(values, {
    a: -1,
    b: -2,
    c: -3
  });

  t.end();
});
