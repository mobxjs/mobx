---
title: How to read this documentation
sidebar_label: How to read this documentation
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# How to read this documentation

The documentation follows the principle that the most commonly used concepts are
introduced before specialized information. This applies to the headings in the table
of concepts as well as the pages under those headings.

We've marked sections and concepts that are more advanced and which you likely don't need to understand until you have a special use case with the [🚀] marker. You can use MobX very effectively without knowing about them, so feel free to skip them and move on to the next section!

The documentation has been rewritten for MobX 6. For older versions of MobX, the documentation can be found [here](https://github.com/mobxjs/mobx/tree/master/docs).
All the principles are the same, and the API is largely the same. The primarily difference is that before MobX 6 [decorators](https://github.com/mobxjs/mobx/blob/master/docs/best/decorators.md) are the recommended syntax to write MobX enhanced classes.

## Guided tour

To get an overall idea of how to use MobX with React, read through this _Basics_ section, in particular [The gist of MobX](concepts.md).
These introduce the most important principles, api's and how they relate.
You should actually be ready to use MobX once you read this!

Here are a few suggestions about the next things to read:

-   [React integration](../react/react-integration.md).

-   [`makeObservable` / `makeAutoObservable`](../refguide/observable.md).

-   It's also useful to at scan through the sections on [observable arrays](../refguide/api.md#observablearray) and [observable maps](../refguide/api.md#observablemap) to see what extra methods are available beyond the built-in JS `Array` and `Map`

-   Learn about [action](../refguide/action.md), which includes a discussion on asynchronous actions.

-   The basics of [computed](../refguide/computed.md).

-   Read about [`autorun`](../refguide/autorun.md), if only because it's used in examples.

-   To get some ideas on how to organize your application's data stores, read [Defining data stores](../best/store.md).

-   If the behavior of MobX confuses you, it's useful to read [What does MobX react to?](../best/what-does-mobx-react-to.md).

-   Get [quick overview of the API](../refguide/api.md), also linked in the top navigation bar.

This should give you a good grounding in day-to-day use of MobX. There is plenty more available you can then read at your own leisure.
