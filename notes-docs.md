# MobX 6 docs

I'm going through the documentation to modify it with MobX 6 changes in mind:

-   Philosophy: one way to do things. Have one through-line and have alternatives (if needed) described elsewhere.

-   Use makeObservable instead of decorators. Still document decorators, but in a separate optional section of the documentation.

-   Assume actions are enforced by default in the docs.

-   Since MobX6 brings back non-Proxy support, I also can clean up discussions of MobX 5 vs 4, assuming the old documentation will become less relevant. (of course it may need to still be available somewhere)

There are a whole bunch of questions that arose when I was editing the docs, see
below. Writing documentation can also help clarify APIs, so hopefully my efforts can contribute to that as well.

To see a live version of the docs, go here:

https://deploy-preview-2382--mobx-docs.netlify.app/

(or click on the 'details' link in netlify/mobx-js/deploy-preview in the built status at the bottom)

## Questions

-   "The props object and the state object of an observer component are automatically made observable to make it easier to create @computed properties that derive from props inside such a component." Does the props bit still apply to function component. Though computed doesn't apply anyhow, unless `useLocalStore` is in use.

-   How to name "compatible property tracking" as opposed to proxy-based? How does one configure it, or it is an automatic fallback?

-   What to do about translations? They will be out of date.

-   Is there a way to regenerate assets? flow.png for instance uses decorators and needs to be updated.

-   When we introduce actions we need a link to an actions section that describes how to turn off strict state reinforcing.

-   How do we document `extendObservable` in the face of the existence of `makeObservable`?

-   Should peek() be brought back on arrays for non-decorator support? I have assumed it is still gone in the docs.

-   The async action document instead of offering "one way to do it" offers many different ways to do it. This may be unavoidable, but perhaps there is a way to at least focus this document. runInAction in particular seems like a pattern that doesn't add that much compared to just extracting actions as methods, especially in combination with makeAutoObservable.

-   Should this `computedRequiresAction` be the default? Or not have it at all?

-   Can you configure `computed` with options when used with `makeObservable`? I assume yes.

-   I am unclear about the order of `makeObservable` / `makeAutoObservable` in the constructor. Does it matter? Is there a good convention? What happens if you don't set a prop and then already talk about it in `makeObservable`? What about `makeAutoObservable`?

-   Does 'makeAutoObservable' work with computedFn? Should we be able to declare this explicitly with `makeObservable`?

## Todo

-   [ ] Netlify preview for docs PR.
-   [ ] Any code sandbox links need to be updated. jsfiddle as well, move it to codesandbox.
-   [ ] Codemod might change to a new package to reduce size. Documentation needs to be updated.
-   [ ] There are a lot of references to external documentation resources. They can probably use a pruning.
-   [ ] We can still write a separate document that introduces "observable" and explains you need to wrap things in `action` if you want to modify things. Is that the right way forward?
-   [ ] Update the 'Getting started tutorial'? It's maintained separately from the documentation - should we attempt to integrate it? The problem with that it is has live code. Docusaurus can run React snippets but the HTML page has very fancy animations. Update it as is?
-   [ ] Remove reference to the https://github.com/mobxjs/mobx-react-boilerplate projects, modify github README there that it's out of date and retired.
-   [ ] makeAutoObservable is handy, but you probably shouldn't use it on a React component to make local state observable. We should say that somewhere.
-   [ ] mweststrate: Only sponsors are needed. For backers / sponsors and sponsoring in general I think we should add an entry in the top menu bar
-   [ ] What to do about the egghead lessons? They use the decorator syntax and may not enforce actions by default. -> consolidate into a single page and explain the decorator story and action on it.
-   [ ] Consider breaking up computed.md into a basic and "advanced" document.
-   [ ] API overview duplicates a lot of the material already discussed elsewhere. Break it into pieces. Introduce a separate API page which has a one line description and a link to the details?

## Structure thoughts

I've made a start of introducing a new structure. Right now the directories
are rather flat and filenames don't always reflect the titles. This encourages people to add and modify documentation without regard to structure, which makes it easy to reference things that haven't been introduced yet. I think it would help to adjust the directory structure to reflect the content.

The goal of this structure is: good flow that introduces the most important bits
first to a typical React developer. In each directory, have the most important
bits come earlier, the less important or advanced bits later.

Here is a proposed structure:

-   Basics

    -   Introduction

    -   Installation

    -   The gist of MobX (or quickstart?)

    -   Concepts & Principles

    -   FAQ

-   MobX and React

    -   React integration

    -   Optimizing React components

    -   React class components

-   Making things observable

    -   makeObservable / makeAutoObservable

    -   observable

    -   objects

    -   arrays

    -   maps

-   Updating observables

    -   action

    -   Asynchronous actions

-   Computed values

    -   computed

    -   Computed options

-   Reacting to observables

    -   autorun

    -   when

    -   reaction

    -   Understanding what MobX reacts to

-   Debugging MobX

    -   toJS

    -   Common Pitfalls

    -   Using trace for debugging

    -   Spy

-   Organizing your application

    -   Best practices

    -   Defining data stores (mention mobx-state-tree, mobx-keystone)

-   Additional topics

    -   Decorators in MobX

    -   Limitations without Proxy Support

    -   Boxed values

    -   Object API

Mine the API docs page to deduplicate content and move it into the
rest of the docs.

API docs page (with one-liners and links) linked somewhere in the page layout.

## Fragments

This fragment is from react-integration. I want to see about creating
a new section on advanced interaction patterns.

### Advanced interaction patterns with reactions, observables, props, etc

In general we recommend to keep UI state and domain state clearly separated,
and manage side effects etc either outside the components using the tools that MobX provides for them (`when`, `flow`, `reaction` etc),
or, if side effects operate on local component state, use the React primitives like [`useEffect`](https://reactjs.org/docs/hooks-effect.html).
Generally it is the clearest to keep those things separated, however, in case you need to cross the boundaries, you might want to check [mobx-react.js.org](https://mobx-react.js.org/) for pattern on how to connect the two frameworks in more complicated scenario's.
