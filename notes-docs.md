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

-   In 'Concepts and Principles' 'observable' is used. Should we rewrite that to 'makeObservable'?
