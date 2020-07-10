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

-   What to do about translations? They will be out of date.

-   Is there a way to regenerate assets? flow.png for instance uses decorators and needs to be updated.

*   Should this `computedRequiresAction` be the default? Or not have it at all?

*   Does 'makeAutoObservable' work with computedFn? Should we be able to declare this explicitly with `makeObservable`?

*   Should we use `mobx-react-lite` in examples primarily? What's up with the
    observer batching story though?

*   What to do with the stateless HMR document? Is it still relevant?

## Todo

-   [x] Netlify preview for docs PR.
-   [ ] Any code sandbox links need to be updated. jsfiddle as well, move it to codesandbox.
-   [x] Codemod might change to a new package to reduce size. Documentation needs to be updated.
-   [ ] There are a lot of references to external documentation resources. They can probably use a pruning.
-   [ ] Update the 'Getting started tutorial'? It's maintained separately from the documentation - should we attempt to integrate it? The problem with that it is has live code. Docusaurus can run React snippets but the HTML page has very fancy animations. Update it as is?
-   [x] Remove reference to the https://github.com/mobxjs/mobx-react-boilerplate projects, modify github README there that it's out of date and retired.
-   [ ] makeAutoObservable is handy, but you probably shouldn't use it on a React component to make local state observable. We should say that somewhere.
-   [x] mweststrate: Only sponsors are needed. For backers / sponsors and sponsoring in general I think we should add an entry in the top menu bar.
-   [ ] This is now incorrect unless we have a way to maintain it. "Become a sponsor and get your logo on our README on Github with a link to your site." Perhaps change to "gold & silver level sponsors" or something?
-   [ ] There is also this document https://github.com/mobxjs/mobx/blob/master/sponsors.md for one time contributions maintained separately.
-   [ ] What to do about the egghead lessons? They use the decorator syntax and may not enforce actions by default. -> consolidate into a single page and explain the decorator story and action on it.
-   [ ] Consider breaking up computed.md into a basic and "advanced" document.
-   [ ] API overview duplicates a lot of the material already discussed elsewhere. Break it into pieces. Introduce a separate API page which has a one line description and a link to the details?
-   [ ] The broken displayName issue with React.memo and thus with observer. Now marked as broken in the docs, but should be updated once fixed.
-   [ ] The debugging information for `observer` components in the React devtools does not match the screenshot in the mobx-react readme anymore. It does seem to work as intended according to the issue though.
-   [ ] Find a good place for `onReactionError`.
-   [x] Invent a "obscure/advanced/special interest" marker and use it on documents that aren't important to newcomers.
-   [ ] Move API overview into UI.
-   [ ] Either flatten docs into a single directory or follow new structure.
-   [ ] How to keep the root README in sync with the docs readme? Keep the sponsors but otherwise place a link to the docs website.
-   [ ] How is LINKS.md related to the docs? Need to clean this up.
-   [ ] Use mobx-react-lite where possible in examples and codesandbox.
-   [ ] Remove batching import from mobx-react-lite from codesandbox when possible.
-   [ ] Add a typescript document to docs with an example.

## Code sandbox todo

-   [ ] spy.md Simple codesandbox trace example: https://codesandbox.io/s/nr58ylyn4m

-   [ ] faq.md MobX works just as well server side, and is already combined with jQuery (see this [Fiddle](http://jsfiddle.net/mweststrate/vxn7qgdw)

-   [ ] concepts.md (https://jsfiddle.net/mweststrate/wv3yopo0/)

-   [x] overview.md Feel free to try this example on [JSFiddle](http://jsfiddle.net/mweststrate/wgbe4guu/).

-   LINKS.md Or fork this [JSFiddle](https://jsfiddle.net/mweststrate/wgbe4guu/). same one was overview.md

-   LINKS.md - A simple webshop using [React + mobx](https://jsfiddle.net/mweststrate/46vL0phw) or [JQuery + mobx](http://jsfiddle.net/mweststrate/vxn7qgdw).

-   LINKS.md [Simple timer](https://jsfiddle.net/mweststrate/wgbe4guu/) application in JSFiddle.

-   LINKS.md [Simple ES5 MobX examples](https://github.com/mattruby/mobx-examples) Bite sized MobX examples all setup to run in jsFiddle.

## Fragments

This fragment is from react-integration. I want to see about creating
a new section on advanced interaction patterns.

### Advanced interaction patterns with reactions, observables, props, etc

In general we recommend to keep UI state and domain state clearly separated,
and manage side effects etc either outside the components using the tools that MobX provides for them (`when`, `flow`, `reaction` etc),
or, if side effects operate on local component state, use the React primitives like [`useEffect`](https://reactjs.org/docs/hooks-effect.html).
Generally it is the clearest to keep those things separated, however, in case you need to cross the boundaries, you might want to check [mobx-react.js.org](https://mobx-react.js.org/) for pattern on how to connect the two frameworks in more complicated scenario's.
