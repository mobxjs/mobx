'use strict';

const exhaustiveMakeObservable = require('./exhaustive-make-observable.js');
const unconditionalMakeObservable = require('./unconditional-make-observable.js');
const missingMakeObservable = require('./missing-make-observable.js');
const noArrowrender = require('./no-arrow-render.js');

module.exports = {
  configs: {
    recommended: {
      plugins: ['mobx'],
      rules: {
        'mobx/exhaustive-make-observable': 'warn',
        'mobx/unconditional-make-observable': 'error',
        'mobx/missing-make-observable': 'error',
        'mobx/no-arrow-render': 'error',
      },
    },
  },
  rules: {
    'exhaustive-make-observable': exhaustiveMakeObservable,
    'unconditional-make-observable': unconditionalMakeObservable,
    'missing-make-observable': missingMakeObservable,
    'no-arrow-render': noArrowrender,
  }
}