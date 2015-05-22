var nodeunit = require('nodeunit-browser-tap');

nodeunit.run([
  require('../observables.js'),
  require('../array.js')
]);