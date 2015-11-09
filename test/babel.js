var test = require('tape')
var browserify = require('browserify')
var vm = require('vm')

test('babel', function (t) {
  t.plan(5)

  var b = browserify(__dirname + '/babel/x.js')
  b.transform('babelify', {
    stage: 0
  })
  b.bundle(function (err, src) {
    if (err) t.fail(err)
    vm.runInNewContext(src, {
      console: { log: log },
      __mobservableViewStack: []
    })
    function log (a, b) { t.deepEqual(a, b) }
  })
})