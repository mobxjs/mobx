---
sidebar_label: Migrating to MobX 6 [🚀]
hide_title: true
---

# TODO

on latest MobX 4 / 5

From 4: set useProxies: "never"

With or without proxies

No loose fields + TS option)

        ["@babel/plugin-proposal-class-properties", { "loose": false }]

TS
"useDefineForClassFields": true

## Upgrading your code with the `mobx-undecorate` codemod

If you are an existing MobX user you have code that uses a lot of decorators, or the equivalent calls to `decorate`.

The [`mobx-undecorate`](https://www.npmjs.com/package/mobx-undecorate) package provides a codemod that can automatically update your code to be conformant to MobX 6. There is no need to install it; instead you download and execute it using the [`npx`](https://www.npmjs.com/package/npx) tool which you do need to install if you haven't already.

To get rid of all uses of MobX decorators and replace them with the equivalent `makeObservable` calls, go to the directory that contains your source code and run:

```shell
npx mobx-undecorate
```

MobX will continue to support decorators -- so if you want to retain them
and only introduce `makeObservable(this)` where required, you can use the `--keepDecorators` option:

```shell
npx mobx-undecorate --keepDecorators
```

### limitations of `mobx-undecorate`

The `mobx-undecorate` command has to introduce a constructor in classes that do not yet have one. If base class of the constructor expects arguments, the codemod cannot introduce these arguments for the subclass being upgraded, and the `super` call won't pass them either. You have to fix these manually.

`mobx-undecorate` outputs warnings for these cases when it's run.

We do have a special case for React class components to do the right thing and
pass along `props` to the superclass.
