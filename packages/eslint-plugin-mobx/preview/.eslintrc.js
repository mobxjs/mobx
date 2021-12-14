module.exports = {
    "extends": [
        "plugin:mobx/recommended"
    ],
    "env": {
        "browser": true,
        "es6": true,
        "node": true
    },
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "plugins": [
        "mobx",
        //"@typescript-eslint"
    ],
    "rules": {
        //'mobx/exhaustive-make-observable': 'off',
        //'mobx/unconditional-make-observable': 'off',
        //'mobx/missing-observer': 'off',
    }
};