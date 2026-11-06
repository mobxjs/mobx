import { expectTransform, code } from "./utils/transform"

const reactCompiler = [
    require.resolve("babel-plugin-react-compiler"),
    { environment: { enableResetCacheOnSourceFileChanges: false } }
]

test("React Compiler listed after the plugin skips observed components and compiles the rest", () => {
    expectTransform(
        code`
export function Counter() { return <div>{store.count}</div> }
export function Pure({ value }) { "use memo"; return <div>{value}</div> }`,
        code`
import { c as _c } from "react/compiler-runtime";
import { observer } from "mobx-react-lite";
export const Counter = observer(function Counter() {
  "use no memo";

  return <div>{store.count}</div>;
});
export function Pure(t0) {
  "use memo";

  const $ = _c(2);
  const {
    value
  } = t0;
  let t1;
  if ($[0] !== value) {
    t1 = <div>{value}</div>;
    $[0] = value;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}`,
        { plugins: [reactCompiler] }
    )
})
