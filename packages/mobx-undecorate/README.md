# mobx-undecorate

Converts MobX 5 to MobX 6 code

Running this code mod:

Go to the folder with your source files and run `npx mobx-undecorate`.

This package converts the following MobX 4/5 API's to their MobX 6 equivalent

-   `@computed`
-   `@action`
-   `@observable`
-   `@observer`
-   `@inject`
-   `decorate

### Options

The following flags are accepted:

-   `--ignoreImports` Normally the codemod will only convert decorators if they are imported from a mobx package. This flag ignores checking for imports and converts all `@computed`, `@action`, `@observable`, `@observer` and `@inject` calls.
-   `--keepDecorators` doesn't rewrite decorators but keeps them as is. But still does generate the required `makeObservable` calls. Use this option if you convert to MobX 6 but will keep using decorators.
-   `--decoratorsAfterExport`: set this flag only if you have `decoratorsBeforeExport: false` in your Babel configuration. (Otherwise you will get an error like `SyntaxError: Decorators must be placed *before* the 'export' keyword. You can set the 'decoratorsBeforeExport' option to false`)
