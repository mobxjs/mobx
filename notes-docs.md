Philosophy: one thing to do things

Questions:

-   What to do about the egghead lessons? They have a reference the decorator
    syntax.

-   The README is rather long. Credits, testimonials, and sponsors in multiple
    places.

-   How to name "compatible property tracking" as opposed to proxy-based?
    How does one configure it, or it is an automatic fallback?

-   What to do about translations? They will be out of date.

-   Is there a way to regenerate assets? flow.png for instance uses
    decorators and needs to be updated.

-   Any code sandbox links need to be updated. jsfiddle as well.

-   If 'observable' (and 'computed' and 'action') get another meaning,
    does this mean that code that uses the old semantics has to import
    these from mobx-decorators?

-   Need to re-establish various links to the getting started sections in the
    README.html.

-   The example for React components in README.md won't work with the new strict default.
    We need to either turn it off explicitly or introduce an action right away. I think
    we should offer an action right away.

-   When we introduce actions we need a link to an actions section that describes
    how to turn off strict state reinforcing.

-   What's the codemod all about?

-   There are a lot of references to external documentation resources. They can probably use
    a pruning.

-   In many examples, such as 'Concepts and Principles' and 'Getting Started' 'observable' is used to make a JS object observable. Should we rewrite that to 'makeObservable'? I've opted to do so to be more consistent in examples and to better fit the strict actions are required world of MobX 6. Is that the right way forward?

-   What to do with the 'Getting started tutorial'? It's maintained separately from  
    the documentation - should we attempt to integrate it? The problem with
    that it is has live code. Docusaurus can run React snippets but the HTML
    page has very fancy animations. Update it as is?
