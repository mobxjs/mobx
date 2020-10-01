# mobx-undecorate

Update MobX 4/5 code to be conformant to MobX 6.

To run this codemod:

-    Go to your source files directory
-    Run `npx mobx-undecorate`

The following MobX 4/5 APIs will be converted to their MobX 6 equivalents:

-   `@computed`
-   `@action`
-   `@observable`
-   `@observer`
-   `@inject`
-   `decorate`

### Options

The following flags are accepted:

-   `--ignoreImports`: normally the codemod will only convert decorators if they are imported from a mobx package. This flag ignores checking for imports and converts all `@computed`, `@action`, `@observable`, `@observer` and `@inject` calls.
-   `--keepDecorators`: don't rewrite decorators but keep them as they are. It still generates the required `makeObservable` calls. Use this option if you convert to MobX 6 but will keep using decorators.
-   `--decoratorsAfterExport`: set this flag only if you have `decoratorsBeforeExport: false` in your Babel configuration. _(Otherwise you will get an error like `SyntaxError: Decorators must be placed *before* the 'export' keyword. You can set the 'decoratorsBeforeExport' option to false`)_
