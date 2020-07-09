---
title: How to read this documentation
sidebar_label: How to read this documentation
hide_title: true
---

# How to read this documentation

The documentation follows the principle that the most commonly used concepts are
introduced before specialized information. This applies to the headings in the table
of concepts as well as the pages under those headings.

We've marked sections and concepts that are more advanced and which you likely don't need to understand until you have a special use case with the [⚛️] marker. You can use MobX very effectively without knowing about them, so feel free to skip them and move on to the next section!

## Guided tour

To get an overall idea of how to use MobX with React, read through this _Basics_ section, in particular [The gist of MobX](overview.md) and [Concepts & Principles](concepts.md). These introduce the most important principles and patterns. You should actually be ready to use MobX once you read this!

Here are a few suggestions about the next things to read:

-   [React integration](../react/react-integration.md).

-   [`makeObservable` / `makeAutoObservable`](../refguide/make-observable.md).

-   Scan through the rules of [`observable`](../refguide/observable.md).

-   It's also useful to at scan through the sections on [observable arrays](../refguide/array.md) and [observable maps](../refguide/map.md) to see what extra methods are available beyond the built-in JS `Array` and `Map`

-   Learn about [action](../refguide/action.md). Read the discussion about [asynchronous actions](../best/actions.md).

-   Read about [`autorun`](../refguide/autorun.md), if only because it's used in examples.

-   To get some ideas on how to organize your application's data stores, read [Defining data stores](../best/store.md).

-   If the behavior of MobX confuses you, it's useful to read [What does MobX react to?](../best/what-does-mobx-react-to.md).

-   Get [quick overview of the API](../refguide/api.md), also linked in the top navigation bar.

This should give you a good grounding in day-to-day use of MobX. There is plenty more available you can then read at your own leisure.
