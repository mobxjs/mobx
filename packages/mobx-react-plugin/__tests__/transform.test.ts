/**
 * @jest-environment node
 */
import { transform, code } from "./utils/transform"

function expectTransform(input: string, expected: string, opts?: Parameters<typeof transform>[1]) {
    expect(transform(input, opts)).toBe(expected)
}

describe("wrapping components in observer", () => {
    test("function declaration", () => {
        expectTransform(
            code`
function Counter() { return <h1>{store.count}</h1> }`,
            code`
import { observer } from "mobx-react-lite";
const Counter = observer(function Counter() {
  "use no memo";

  return <h1>{store.count}</h1>;
});`
        )
    })

    test("exported function declaration", () => {
        expectTransform(
            code`
export function Counter() { return <h1 /> }`,
            code`
import { observer } from "mobx-react-lite";
export const Counter = observer(function Counter() {
  "use no memo";

  return <h1 />;
});`
        )
    })

    test("default exported function declaration", () => {
        expectTransform(
            code`
export default function Page() { return <h1 /> }`,
            code`
import { observer } from "mobx-react-lite";
export default observer(function Page() {
  "use no memo";

  return <h1 />;
});`
        )
    })

    test("default exported function declaration that is referenced elsewhere keeps its binding", () => {
        expectTransform(
            code`
export default function Page() { return <h1 /> }
Page.displayName = "P"`,
            code`
import { observer } from "mobx-react-lite";
const Page = observer(function Page() {
  "use no memo";

  return <h1 />;
});
export default Page;
Page.displayName = "P";`
        )
    })

    test("anonymous default export gets its name from the file name", () => {
        expectTransform(
            code`
export default function () { return <h1 /> }`,
            code`
import { observer } from "mobx-react-lite";
export default observer(function TodoList() {
  "use no memo";

  return <h1 />;
});`,
            { filename: "/project/src/TodoList.tsx" }
        )
        expectTransform(
            code`
export default () => <h1 />`,
            code`
import { observer } from "mobx-react-lite";
export default observer(function TodoList() {
  "use no memo";

  return <h1 />;
});`,
            { filename: "/project/src/todo-list/index.tsx" }
        )
    })

    test("anonymous default export stays anonymous when the inferred name is taken", () => {
        expectTransform(
            code`
import Page from "./Page"
export default () => <Page />`,
            code`
import Page from "./Page";
import { observer } from "mobx-react-lite";
export default observer(() => {
  "use no memo";

  return <Page />;
});`,
            { filename: "/project/src/page.tsx" }
        )
    })

    test("arrow function components become named function expressions (keeps the DevTools name)", () => {
        expectTransform(
            code`
const Counter = () => <h1>{store.count}</h1>
export const Hooked = () => { const s = useStore(); return s.count }`,
            code`
import { observer } from "mobx-react-lite";
const Counter = observer(function Counter() {
  "use no memo";

  return <h1>{store.count}</h1>;
});
export const Hooked = observer(function Hooked() {
  "use no memo";

  const s = useStore();
  return s.count;
});`
        )
    })

    test("arrow functions using `this` are kept as arrow functions", () => {
        expectTransform(
            code`
const A = () => { return <a onClick={() => this.x} /> }`,
            code`
import { observer } from "mobx-react-lite";
const A = observer(() => {
  "use no memo";

  return <a onClick={() => this.x} />;
});`
        )
    })

    test("function expressions", () => {
        expectTransform(
            code`
const A = function () { return <a /> }
const B = function Inner() { return <b /> }
let C = () => <c />
var D = function () { return <d /> }`,
            code`
import { observer } from "mobx-react-lite";
const A = observer(function A() {
  "use no memo";

  return <a />;
});
const B = observer(function Inner() {
  "use no memo";

  return <b />;
});
let C = observer(function C() {
  "use no memo";

  return <c />;
});
var D = observer(function D() {
  "use no memo";

  return <d />;
});`
        )
    })

    test("multiple declarators", () => {
        expectTransform(
            code`
const A = () => <a />, B = () => <b />, c = 1`,
            code`
import { observer } from "mobx-react-lite";
const A = observer(function A() {
    "use no memo";

    return <a />;
  }),
  B = observer(function B() {
    "use no memo";

    return <b />;
  }),
  c = 1;`
        )
    })

    test("TypeScript annotations and generics are preserved", () => {
        expectTransform(
            code`
function List<T>(props: Props<T>): JSX.Element { return <ul /> }
const Grid = <T,>(props: Props<T>) => <table />
const X: FC<P> = (p) => <div />`,
            code`
import { observer } from "mobx-react-lite";
const List = observer(function List<T>(props: Props<T>): JSX.Element {
  "use no memo";

  return <ul />;
});
const Grid = observer(function Grid<T>(props: Props<T>) {
  "use no memo";

  return <table />;
});
const X: FC<P> = observer(function X(p) {
  "use no memo";

  return <div />;
});`
        )
    })

    test("comments are kept", () => {
        expectTransform(
            code`
// leading comment
/** doc */
export function A() { return <div /> }
// trailing`,
            code`
import { observer } from "mobx-react-lite";
// leading comment
/** doc */
export const A = observer(function A() {
  "use no memo";

  return <div />;
});
// trailing`
        )
    })
})

describe("self references", () => {
    test("recursive function declaration renders the observed component, not the raw function", () => {
        expectTransform(
            code`
export function Tree({ node }) { return <ul>{node.children.map(c => <Tree key={c.id} node={c} />)}</ul> }`,
            code`
import { observer } from "mobx-react-lite";
export const Tree = observer(function Tree({
  node
}) {
  "use no memo";

  return <ul>{node.children.map(c => <_Tree key={c.id} node={c} />)}</ul>;
});
const _Tree = Tree;`
        )
    })

    test("recursive arrow function", () => {
        expectTransform(
            code`
const Tree = ({ node }) => <ul>{node.children.map(c => <Tree node={c} />)}</ul>
export { Tree }`,
            code`
import { observer } from "mobx-react-lite";
const Tree = observer(function Tree({
  node
}) {
  "use no memo";

  return <ul>{node.children.map(c => <_Tree node={c} />)}</ul>;
});
const _Tree = Tree;
export { Tree };`
        )
    })

    test("recursive default export", () => {
        expectTransform(
            code`
export default function Tree({ node }) { return <Tree.Item node={node} /> }`,
            code`
import { observer } from "mobx-react-lite";
const Tree = observer(function Tree({
  node
}) {
  "use no memo";

  return <_Tree.Item node={node} />;
});
const _Tree = Tree;
export default Tree;`
        )
    })
})

describe("self references of components that are already observed (mobxjs/mobx#3836)", () => {
    test("observer(function Name() {}) assigned to a variable", () => {
        expectTransform(
            code`
import { observer } from "mobx-react-lite"
export const TodoItem = observer(function TodoItem({ item }) {
    return <div>{item.children.map(child => <TodoItem key={child.id} item={child} />)}</div>
})`,
            code`
import { observer } from "mobx-react-lite";
export const TodoItem = observer(function TodoItem({
  item
}) {
  "use no memo";

  return <div>{item.children.map(child => <_TodoItem key={child.id} item={child} />)}</div>;
});
const _TodoItem = TodoItem;`
        )
    })

    test("observer(function Name() {}) as default export", () => {
        expectTransform(
            code`
import { observer } from "mobx-react-lite"
export default observer(function Tree({ node }) { return <Tree.Item node={node} /> })`,
            code`
import { observer } from "mobx-react-lite";
const Tree = observer(function Tree({
  node
}) {
  "use no memo";

  return <_Tree.Item node={node} />;
});
const _Tree = Tree;
export default Tree;`
        )
    })

    test("function declaration observed by reference", () => {
        expectTransform(
            code`
import { observer } from "mobx-react-lite"
function TodoItem({ item }) {
    return <ul>{item.children.map(child => <TodoItem key={child.id} item={child} />)}</ul>
}
export default observer(TodoItem)`,
            code`
import { observer } from "mobx-react-lite";
function TodoItem({
  item
}) {
  "use no memo";

  return <ul>{item.children.map(child => <TodoItemObserver key={child.id} item={child} />)}</ul>;
}
const TodoItemObserver = observer(TodoItem);
export default TodoItemObserver;`
        )
        expectTransform(
            code`
import { observer } from "mobx-react-lite"
function TodoItem({ item }) {
    return <ul>{item.children.map(child => <TodoItem key={child.id} item={child} />)}</ul>
}
export const ObservedTodoItem = observer(TodoItem)`,
            code`
import { observer } from "mobx-react-lite";
function TodoItem({
  item
}) {
  "use no memo";

  return <ul>{item.children.map(child => <ObservedTodoItem key={child.id} item={child} />)}</ul>;
}
export const ObservedTodoItem = observer(TodoItem);`
        )
    })

    test("non-recursive observed components are not touched", () => {
        expectTransform(
            code`
import { observer } from "mobx-react-lite"
export const Leaf = observer(function Leaf({ item }) { return <li>{item.text}</li> })`,
            code`
import { observer } from "mobx-react-lite";
export const Leaf = observer(function Leaf({
  item
}) {
  "use no memo";

  return <li>{item.text}</li>;
});`
        )
    })
})

describe("components that are already observed", () => {
    test("inline observer: only the directive is added", () => {
        expectTransform(
            code`
import { observer } from "mobx-react-lite"
const X = observer(() => <div />)
const Y = observer(function Y() { return <div /> })`,
            code`
import { observer } from "mobx-react-lite";
const X = observer(() => {
  "use no memo";

  return <div />;
});
const Y = observer(function Y() {
  "use no memo";

  return <div />;
});`
        )
    })

    test("observer applied by reference elsewhere in the file", () => {
        expectTransform(
            code`
import { observer } from "mobx-react-lite"
function X() { return <div /> }
export default observer(X)`,
            code`
import { observer } from "mobx-react-lite";
function X() {
  "use no memo";

  return <div />;
}
export default observer(X);`
        )
    })
})

describe("forwardRef and memo", () => {
    test("React 19 ref as a prop needs nothing special", () => {
        expectTransform(
            code`
export function Input({ ref, value }) { return <input ref={ref} value={value} /> }`,
            code`
import { observer } from "mobx-react-lite";
export const Input = observer(function Input({
  ref,
  value
}) {
  "use no memo";

  return <input ref={ref} value={value} />;
});`
        )
    })

    test("inline forwardRef is wrapped on the outside (forwardRef needs a plain render function)", () => {
        expectTransform(
            code`
import { forwardRef } from "react"
const Input = forwardRef((props, ref) => <input ref={ref} />)
export default forwardRef(function Area(props, ref) { return <textarea ref={ref} /> })`,
            code`
import { forwardRef } from "react";
import { observer } from "mobx-react-lite";
const Input = observer(forwardRef(function Input(props, ref) {
  "use no memo";

  return <input ref={ref} />;
}));
export default observer(forwardRef(function Area(props, ref) {
  "use no memo";

  return <textarea ref={ref} />;
}));`
        )
    })

    test("forwardRef applied by reference: the call sites are wrapped", () => {
        expectTransform(
            code`
import { forwardRef } from "react"
function Input(props, ref) { return <input ref={ref} /> }
export default forwardRef(Input)`,
            code`
import { forwardRef } from "react";
import { observer } from "mobx-react-lite";
function Input(props, ref) {
  "use no memo";

  return <input ref={ref} />;
}
export default observer(forwardRef(Input));`
        )
    })

    test("memo(Component) becomes observer(Component), which already memoizes", () => {
        expectTransform(
            code`
import { memo } from "react"
const X = memo(() => <div />)
export default memo(function Y() { return <div /> })`,
            code`
import { memo } from "react";
import { observer } from "mobx-react-lite";
const X = observer(function X() {
  "use no memo";

  return <div />;
});
export default observer(function Y() {
  "use no memo";

  return <div />;
});`
        )
    })

    test("memo with a custom comparator keeps memo", () => {
        expectTransform(
            code`
import { memo } from "react"
const X = memo((p) => <div />, areEqual)`,
            code`
import { memo } from "react";
import { observer } from "mobx-react-lite";
const X = memo(observer(function X(p) {
  "use no memo";

  return <div />;
}), areEqual);`
        )
    })

    test("memo(forwardRef(...))", () => {
        expectTransform(
            code`
import { memo, forwardRef } from "react"
const X = memo(forwardRef((p, ref) => <div ref={ref} />))
const Y = memo(forwardRef((p, ref) => <div ref={ref} />), eq)`,
            code`
import { memo, forwardRef } from "react";
import { observer } from "mobx-react-lite";
const X = observer(forwardRef(function X(p, ref) {
  "use no memo";

  return <div ref={ref} />;
}));
const Y = memo(observer(forwardRef(function Y(p, ref) {
  "use no memo";

  return <div ref={ref} />;
})), eq);`
        )
    })

    test("React.memo / React.forwardRef", () => {
        expectTransform(
            code`
import React from "react"
const X = React.memo(() => <div />)
const Y = React.forwardRef((p, ref) => <div />)`,
            code`
import React from "react";
import { observer } from "mobx-react-lite";
const X = observer(function X() {
  "use no memo";

  return <div />;
});
const Y = observer(React.forwardRef(function Y(p, ref) {
  "use no memo";

  return <div />;
}));`
        )
    })
})

describe("hooks", () => {
    test("custom hooks only get the directive", () => {
        expectTransform(
            code`
function useTodos() { const s = useStore(); return s.todos.filter(t => t.done) }
const useCount = () => useStore().count
export const useNothing = () => 1`,
            code`
function useTodos() {
  "use no memo";

  const s = useStore();
  return s.todos.filter(t => t.done);
}
const useCount = () => {
  "use no memo";

  return useStore().count;
};
export const useNothing = () => 1;`
        )
    })

    test("useNoMemoHooks: false", () => {
        expectTransform(
            code`
function A() { return <div /> }
function useA() { return useB() }`,
            code`
import { observer } from "mobx-react-lite";
const A = observer(function A() {
  "use no memo";

  return <div />;
});
function useA() {
  return useB();
}`,
            { options: { observer: { useNoMemoHooks: false } } }
        )
    })
})

describe("functions that are not components", () => {
    test("are left alone", () => {
        const input = code`
function counter() { return <h1 /> }
function Util() { return 1 }
function Obj() { return { a: <div /> } }
function Three(a, b, c) { return <div /> }
class A extends React.Component { render() { return <div /> } }
const Styled = styled(() => <div />)
export default connect(mapState)(function B() { return <div /> })`
        expectTransform(
            input,
            code`
function counter() {
  return <h1 />;
}
function Util() {
  return 1;
}
function Obj() {
  return {
    a: <div />
  };
}
function Three(a, b, c) {
  return <div />;
}
class A extends React.Component {
  render() {
    return <div />;
  }
}
const Styled = styled(() => <div />);
export default connect(mapState)(function B() {
  return <div />;
});`
        )
    })

    test("components React Compiler would compile but that cannot be wrapped only get the directive", () => {
        expectTransform(
            code`
function createPage(store) { function Page() { return <div>{store.x}</div> } return Page }
const routes = { Home: () => <div /> }`,
            code`
function createPage(store) {
  function Page() {
    "use no memo";

    return <div>{store.x}</div>;
  }
  return Page;
}
const routes = {
  Home: () => {
    "use no memo";

    return <div />;
  }
};`
        )
    })
})

describe("directives", () => {
    test("existing opt-out directives are respected and not duplicated", () => {
        expectTransform(
            code`
function A() { "use no memo"; return <div /> }
function B() { "use no forget"; return <div /> }
function C() { "use strict"; return <div /> }`,
            code`
import { observer } from "mobx-react-lite";
const A = observer(function A() {
  "use no memo";

  return <div />;
});
const B = observer(function B() {
  "use no forget";

  return <div />;
});
const C = observer(function C() {
  "use strict";
  "use no memo";

  return <div />;
});`
        )
    })

    test('"use memo" means React Compiler owns the component: it is not wrapped', () => {
        expectTransform(
            code`
function X() { "use memo"; return <div /> }`,
            code`
function X() {
  "use memo";

  return <div />;
}`
        )
    })

    test('"use memo" inside an observer is an error', () => {
        expect(() =>
            transform(code`
import { observer } from "mobx-react-lite"
const X = observer(function X() { "use memo"; return <div /> })`)
        ).toThrow(
            /Component `X` is wrapped in `observer` but also contains the "use memo" directive/
        )
        expect(() =>
            transform(code`
import { observer } from "mobx-react-lite"
function X() { "use memo"; return <div /> }
export default observer(X)`)
        ).toThrow(/Component `X` is wrapped in `observer`/)
    })

    test('module level "use no memo" disables the function level directives', () => {
        expectTransform(
            code`
"use no memo"
function A() { return <div /> }
function useA() { return useB() }`,
            code`
"use no memo";

import { observer } from "mobx-react-lite";
const A = observer(function A() {
  return <div />;
});
function useA() {
  return useB();
}`
        )
    })

    test("useNoMemo: false", () => {
        expectTransform(
            code`
function A() { return <div /> }
function useA() { return useB() }`,
            code`
import { observer } from "mobx-react-lite";
const A = observer(function A() {
  return <div />;
});
function useA() {
  return useB();
}`,
            { options: { observer: { useNoMemo: false } } }
        )
    })

    test('"use client" is preserved, "use server" modules are skipped', () => {
        expectTransform(
            code`
"use client"
export function A() { return <div /> }`,
            code`
"use client";

import { observer } from "mobx-react-lite";
export const A = observer(function A() {
  "use no memo";

  return <div />;
});`
        )
        expectTransform(
            code`
"use server"
function A() { return <div /> }`,
            code`
"use server";

function A() {
  return <div />;
}`
        )
    })
})

describe("observer import", () => {
    test("is added after the existing imports", () => {
        expectTransform(
            code`
import React from "react"
import { store } from "./store"
function A() { return <div /> }`,
            code`
import React from "react";
import { store } from "./store";
import { observer } from "mobx-react-lite";
const A = observer(function A() {
  "use no memo";

  return <div />;
});`
        )
    })

    test("reuses an existing import, also from mobx-react and under an alias", () => {
        expectTransform(
            code`
import { observer } from "mobx-react"
function A() { return <div /> }`,
            code`
import { observer } from "mobx-react";
const A = observer(function A() {
  "use no memo";

  return <div />;
});`
        )
        expectTransform(
            code`
import { observer as obs } from "mobx-react-lite"
function A() { return <div /> }`,
            code`
import { observer as obs } from "mobx-react-lite";
const A = obs(function A() {
  "use no memo";

  return <div />;
});`
        )
    })

    test("is appended to an existing import of the same module", () => {
        expectTransform(
            code`
import { useLocalObservable } from "mobx-react-lite"
function A() { return <div /> }`,
            code`
import { useLocalObservable, observer } from "mobx-react-lite";
const A = observer(function A() {
  "use no memo";

  return <div />;
});`
        )
    })

    test("uses a unique name when `observer` is taken", () => {
        expectTransform(
            code`
const observer = new IntersectionObserver(() => {})
function A() { return <div /> }`,
            code`
import { observer as _observer } from "mobx-react-lite";
const observer = new IntersectionObserver(() => {});
const A = _observer(function A() {
  "use no memo";

  return <div />;
});`
        )
    })

    test("importSource option", () => {
        expectTransform(
            code`
function A() { return <div /> }`,
            code`
import { observer } from "mobx-react";
const A = observer(function A() {
  "use no memo";

  return <div />;
});`,
            { options: { observer: { importSource: "mobx-react" } } }
        )
    })

    test("CommonJS modules use require", () => {
        expectTransform(
            code`
const React = require("react")
function A() { return <div /> }
module.exports = A`,
            code`
const {
  observer
} = require("mobx-react-lite");
const React = require("react");
const A = observer(function A() {
  "use no memo";

  return <div />;
});
module.exports = A;`,
            { sourceType: "script" }
        )
    })

    test("survives TypeScript import elision", () => {
        expectTransform(
            code`
import type { Props } from "./types"
function A(props: Props) { return <div /> }`,
            code`
import { observer } from "mobx-react-lite";
const A = observer(function A(props) {
  "use no memo";

  return <div />;
});`,
            {
                presets: [
                    [
                        require.resolve("@babel/preset-typescript"),
                        { isTSX: true, allExtensions: true }
                    ]
                ]
            }
        )
    })
})

describe("file filtering", () => {
    const input = code`
function A() { return <div /> }`
    const untouched = code`
function A() {
  return <div />;
}`

    test("node_modules are never transformed", () => {
        expectTransform(input, untouched, { filename: "/project/node_modules/lib/A.tsx" })
    })

    test("exclude globs are matched relative to the root", () => {
        expectTransform(input, untouched, {
            options: { exclude: ["src/ui/**"] },
            filename: "/project/src/ui/A.tsx"
        })
        expect(
            transform(input, {
                options: { exclude: ["src/ui/**"] },
                filename: "/project/src/app/A.tsx"
            })
        ).toContain("observer(")
    })

    test("include restricts the transform", () => {
        expectTransform(input, untouched, {
            options: { include: [/src\/components/] },
            filename: "/project/src/ui/A.tsx"
        })
        expect(
            transform(input, {
                options: { include: ["src/ui/**"] },
                filename: "/project/src/ui/A.tsx"
            })
        ).toContain("observer(")
    })

    test("predicates", () => {
        expectTransform(input, untouched, {
            options: { exclude: (filename: string) => filename.endsWith("A.tsx") },
            filename: "/project/src/A.tsx"
        })
    })
})

describe("options", () => {
    test('clientOnly only transforms "use client" modules', () => {
        const input = code`
export function A() { return <div /> }`
        expectTransform(
            input,
            code`
export function A() {
  return <div />;
}`,
            { options: { observer: { clientOnly: true } } }
        )
        expect(
            transform(`"use client"\n${input}`, { options: { observer: { clientOnly: true } } })
        ).toContain("observer(function A()")
    })

    test("unknown options are rejected", () => {
        expect(() => transform("const a = 1", { options: { foo: 1 } as any })).toThrow(
            /Unknown option "foo"/
        )
        expect(() =>
            transform("const a = 1", { options: { observer: { foo: 1 } } as any })
        ).toThrow(/Unknown observer option "foo"/)
    })

    test("observer: false disables the component transform", () => {
        expectTransform(
            code`
function A() { return <div /> }`,
            code`
function A() {
  return <div />;
}`,
            { options: { observer: false } }
        )
    })
})

describe("syntax support", () => {
    test("modern decorators and auto accessors", () => {
        expect(
            transform(code`
class Store { @observable accessor x = 1 }
function A() { return <div /> }`)
        ).toContain("observer(function A()")
    })
})

describe("react-refresh", () => {
    test("registers the wrapped component under its name", () => {
        const output = transform(
            code`
export function Counter() { return <div>{store.count}</div> }`,
            { plugins: [[require.resolve("react-refresh/babel"), { skipEnvCheck: true }]] }
        )
        expect(output).toContain("export const Counter = observer(_c = function Counter() {")
        expect(output).toContain('$RefreshReg$(_c, "Counter$")')
        expect(output).toContain('$RefreshReg$(_c2, "Counter")')
    })
})
