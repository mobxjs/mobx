var test = require('tape')
var path = require('path')
var spawn = require('child_process').spawn
var vm = require('vm')
var os = require('os')

var tmpdir = path.join((os.tmpdir || os.tmpDir)(), 'mobservable-' + Math.random())

test('typescript', function (t) {
  t.plan(2)

  var ps = spawn(path.resolve(__dirname, '../node_modules/.bin/tsc'),[
    '-m', 'commonjs', '--experimentalDecorators', '--outDir', tmpdir, '-t', 'es5',
    'typescript/x.ts'])

  var err = ''
  ps.stderr.on('data', function (s) { err += s })

  ps.on('exit', function (code) {
    t.equal(code, 0)

    process.env.NODE_PATH = [
      process.env.NODE_PATH,
      path.join(__dirname, '..', 'node_modules')
    ].filter(Boolean).join(':')

    var ps = spawn(process.execPath, [
      path.resolve(__dirname, path.join(tmpdir, 'test', 'typescript', 'x.js'))
    ])

    var out = ''
    ps.stdout.on('data', function (s) { out += s })

    ps.on('exit', function (code) {
      t.equal(code, 0)
    })

  })
})