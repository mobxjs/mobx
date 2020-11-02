# mobx-undecorate

Update MobX 4/5 code to be conformant to MobX 6.

To run this codemod:

-   Go to your source files directory
-   Run `npx mobx-undecorate`

The following MobX 4/5 APIs will be converted to their MobX 6 equivalents:

-   `@computed`
-   `@action`
-   `@observable`
-   `@observer`
-   `@inject`
-   `decorate`

### Options

The following flags are accepted:

-   `--ignoreImports`: normally the codemod will only convert decorators if they are imported from a MobX package, using import statements like `import {observable} from "mobx"`. This flag ignores checking for imports statements and converts all `@computed`, `@action`, `@observable`, `@observer` and `@inject` calls.
-   `--keepDecorators`: don't rewrite decorators but keep them as they are, and generate the required `makeObservable` calls. Use this option if you intend to keep using decorators after updating to MobX 6.
-   `--decoratorsAfterExport`: set this flag only if you have `decoratorsBeforeExport: false` in your Babel configuration, otherwise you will get an error like: `SyntaxError: Decorators must be placed *before* the 'export' keyword. You can set the 'decoratorsBeforeExport' option to false`.

### Changelog

#### Unreleased

-   Fix [#2540](https://github.com/mobxjs/mobx/issues/2540) makeObservable not added to imports
-   Fix [#2558](https://github.com/mobxjs/mobx/issues/2558) Undecorate removes non-mobx decorator

#### 1.0.2

-   Fixed support for JSX
