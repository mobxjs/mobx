Philosophy: one thing to do things

Questions:

-   "The props object and the state object of an observer component are automatically
    made observable to make it easier to create @computed properties that derive from props inside such a component." - Does the props bit still apply to function
    component. Though computed doesn't apply anyhow, unless `useLocalStore` is in
    use.

-   What to do about the egghead lessons? They have a reference the decorator
    syntax. -> consolidate into a single page and explain the decorator story on it.

-   How to name "compatible property tracking" as opposed to proxy-based?
    How does one configure it, or it is an automatic fallback?

-   What to do about translations? They will be out of date.

-   Is there a way to regenerate assets? flow.png for instance uses
    decorators and needs to be updated.

-   When we introduce actions we need a link to an actions section that describes
    how to turn off strict state reinforcing.

-   How do we document `extendObservable` in the face of the existence of `makeObservable`?

-   Should peek() be brought back on arrays for non-decorator support? I have assumed
    it is still gone in the docs.

-   The async action document instead of offering "one way to do it" offers many different ways to do it. This may be unavoidable, but perhaps there is a way to at least focus this document. runInAction in particular seems like a pattern that doesn't add that much compared to just extracting actions as methods, especially in combination with makeAutoObservable.

Todo

-   [ ] Netlify preview for docs PR.
-   [ ] Any code sandbox links need to be updated. jsfiddle as well, move it to codesandbox.
-   [ ] Codemod might change to a new package to reduce size. Documentation needs to be updated.
-   [ ] There are a lot of references to external documentation resources. They can probably use a pruning.
-   [ ] We can still write a separate document that introduces "observable" and explains you need to wrap things in `action` if you want to modify things. Is that the right way forward?
-   [ ] Update the 'Getting started tutorial'? It's maintained separately from the documentation - should we attempt to integrate it? The problem with that it is has live code. Docusaurus can run React snippets but the HTML page has very fancy animations. Update it as is?
-   [ ] Remove reference to the https://github.com/mobxjs/mobx-react-boilerplate projects, modify github README there that it's out of date and retired.
-   [ ] makeAutoObservable is handy, but you probably shouldn't use it on a React component to make local state observable. We should say that somewhere.
-   [ ] mweststrate: Only sponsors are needed. For backers / sponsors and sponsoring in general I think we should add an entry in the top menu bar

Fragments

This fragment is from react-integration. I want to see about creating
a new section on advanced interaction patterns.

#### Advanced interaction patterns with reactions, observables, props, etc

In general we recommend to keep UI state and domain state clearly separated,
and manage side effects etc either outside the components using the tools that MobX provides for them (`when`, `flow`, `reaction` etc),
or, if side effects operate on local component state, use the React primitives like [`useEffect`](https://reactjs.org/docs/hooks-effect.html).
Generally it is the clearest to keep those things separated, however, in case you need to cross the boundaries, you might want to check [mobx-react.js.org](https://mobx-react.js.org/) for pattern on how to connect the two frameworks in more complicated scenario's.
