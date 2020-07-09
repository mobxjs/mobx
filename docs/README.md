---
title: Introduction
sidebar_label: Introduction
hide_title: true
---

<img src="assets/mobx.png" alt="logo" height="120" align="right" />

# MobX

_Simple, scalable state management_

[![Build Status](https://travis-ci.org/mobxjs/mobx.svg?branch=master)](https://travis-ci.org/mobxjs/mobx)
[![Coverage Status](https://coveralls.io/repos/mobxjs/mobx/badge.svg?branch=master&service=github)](https://coveralls.io/github/mobxjs/mobx?branch=master)
[![Join the chat at https://gitter.im/mobxjs/mobx](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/mobxjs/mobx?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Discuss MobX on Hashnode](https://hashnode.github.io/badges/mobx.svg)](https://hashnode.com/n/mobx)
[![OpenCollective](https://opencollective.com/mobx/backers/badge.svg)](#backers)
[![OpenCollective](https://opencollective.com/mobx/sponsors/badge.svg)](#sponsors)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

MobX is proudly sponsored by Mendix, Coinbase, Facebook Open Source, Canva, Algolia, Guilded, Auction Frontier, Mantro and TalentPlot for 100\$/month or more! And beyond that by many [individual backers](http://mobxjs.github.io/mobx/backers-sponsors.html#backers) and through [one time contributions](https://github.com/mobxjs/mobx/blob/master/sponsors.md).

**🥇Gold sponsors (\$3000+ total contribution):** <br/>
<a href="https://mendix.com/"><img src="assets/mendix-logo.png" align="center" width="100" title="Mendix" alt="Mendix" /></a>
<a href="https://frontendmasters.com/"><img src="assets/frontendmasters.jpg" align="center" width="100" title="Frontend Masters" alt="Frontend Masters"></a>
<a href="https://opensource.facebook.com/"><img src="assets/fbos.jpeg" align="center" width="100" title="Facebook Open Source" alt="Facebook Open Source" /></a>
<a href="http://auctionfrontier.com/"><img src="assets/auctionfrontier.jpeg" align="center" width="100" title="Auction Frontier" alt="Auction Frontier"></a>
<a href="https://www.guilded.gg/"><img src="assets/guilded.jpg" align="center" width="100" title="Guilded" alt="Guilded" /></a>
<a href="https://coinbase.com/"><img src="assets/coinbase.jpeg" align="center" width="100" title="Coinbase" alt="Coinbase" /></a>
<a href="https://www.canva.com/"><img src="assets/canva.png" align="center" width="100" title="Canva" alt="Canva" /></a>

**🥈Silver sponsors (\$100+ pm):**<br/>
<a href="https://mantro.net/jobs/warlock"><img src="assets/mantro.png" align="center" width="100" title="mantro GmbH" alt="mantro GmbH"></a>
<a href="https://www.codefirst.co.uk/"><img src="assets/codefirst.png" align="center" width="100" title="CodeFirst" alt="CodeFirst"/></a>
<a href="https://www.bugsnag.com/platforms/react-error-reporting?utm_source=MobX&utm_medium=Website&utm_content=open-source&utm_campaign=2019-community&utm_term=20190913"><img src="assets/bugsnag.jpg" align="center" width="100" title="Bugsnag" alt="Bugsnag"/></a>
<a href="https://curology.com/blog/tech"><img src="assets/curology.png" align="center" width="100" title="Curology" alt="Curology"/></a>
<a href="https://casino.net"><img src="assets/casino.png" align="center" width="100" title="casino.net and affiliates" alt="casino.net"/></a>

**🥉Bronze sponsors (\$500+ total contributions):**<br/>
<a href="https://www.algolia.com/"><img src="assets/algolia.jpg" align="center" width="100" title="Algolia" alt="Algolia" /></a>
<a href="https://talentplot.com/"><img src="assets/talentplot.png" align="center" width="100" title="talentplot" alt="talentplot"></a>
<a href="https://careers.dazn.com/"><img src="assets/dazn.png" align="center" width="100" title="DAZN" alt="DAZN"></a>
<a href="https://blokt.com/"><img src="assets/blokt.jpg" align="center" width="100" title="Blokt" alt="Blokt"/></a>

# Installation

MobX >=6 runs in any ES5 environment, which includes web browsers and NodeJS.

Installation: `npm install mobx --save`. React bindings: `npm install mobx-react --save`.

[More about installing MobX](http://mobxjs.github.io/mobx/intro/installation.html)

## Introduction

MobX is a battle tested library that makes state management simple and scalable by transparently applying functional reactive programming (TFRP).
The philosophy behind MobX is very simple:

_Anything that can be derived from the application state, should be derived. Automatically._

which includes the UI, data serialization, server communication, etc.

<img alt="MobX unidirectional flow" src="assets/flow.png" align="center" />

React and MobX together are a powerful combination. React renders the application state by providing mechanisms to translate it into a tree of renderable components. MobX provides the mechanism to store and update the application state that React then uses.

Both React and MobX provide an optimal and unique solutions to common problems in application development. React provides mechanisms to optimally render UI by using a virtual DOM that reduces the number of costly DOM mutations. MobX provides mechanisms to optimally synchronize application state with your React components by using a reactive virtual dependency state graph that is only updated when strictly needed and is never stale.

## Example

So what does code that uses MobX look like?

```javascript
import React from "react"
import ReactDOM from "react-dom"
import { makeAutoObservable } from "mobx"
import { observer } from "mobx-react"

// define application state
class Timer {
    secondsPassed = 0

    constructor() {
        makeAutoObservable(this)
    }

    increaseTimer() {
        this.secondsPassed += 1
    }

    resetTimer() {
        this.secondsPassed = 0
    }
}

const myTimer = new Timer()

setInterval(() => {
    myTimer.increaseTimer()
}, 1000)

const TimerView = observer(({ timer }) => (
    <button onClick={() => timer.resetTimer()}>Seconds passed: {timer.secondsPassed}</button>
))
ReactDOM.render(<TimerView timer={myTimer} />, document.body)
```

To get more detail about this example, see [the gist of MobX](http://mobxjs.github.io/mobx/intro/overview.html).

To learn about the underlying concepts together with a larger example, please read [Concepts & Principles](http://mobxjs.github.io/mobx/intro/concepts.html)

Then see what to [read next](http://mobxjs.github/mobx/intro/how-to-read.html).

### MobX and Decorators

Wait! This example doesn't use decorators. Haven't you seen MobX code before that uses them? In MobX 6 we have chosen to move away from them for maximum compatibility with standard JavaScript.

There is a codemod available to help you upgrade existing code to be compliant with MobX 6.

The [decorators guide](http://mobxjs.github.io/mobx/best/decorators.html) has more information.

## MobX: Simple and scalable

MobX is one of the least obtrusive libraries you can use for state management. That makes the `MobX` approach not just simple, but very scalable as well:

### Using classes and real references

With MobX you don't need to normalize your data. This makes the library very suitable for very complex domain models (At Mendix for example ~500 different domain classes in a single application).

### Referential integrity is guaranteed

Since data doesn't need to be normalized, and MobX automatically tracks the relations between state and derivations, you get referential integrity for free. Rendering something that is accessed through three levels of indirection?

No problem, MobX will track them and re-render whenever one of the references changes. As a result staleness bugs are a thing of the past. As a programmer you might forget that changing some data might influence a seemingly unrelated component in a corner case. MobX won't forget.

### Simpler actions are easier to maintain

As demonstrated above, modifying state when using MobX is very straightforward. You simply write down your intentions. MobX will take care of the rest.

### Fine grained observability is efficient

MobX builds a graph of all the derivations in your application to find the least number of re-computations that is needed to prevent staleness. "Derive everything" might sound expensive, MobX builds a virtual derivation graph to minimize the number of recomputations needed to keep derivations in sync with the state.

In fact, when testing MobX at Mendix we found out that using this library to track the relations in our code is often a lot more efficient than pushing changes through our application by using handwritten events or "smart" selector based container components.

The simple reason is that MobX will establish far more fine grained 'listeners' on your data than you would do as a programmer.

Secondly MobX sees the causality between derivations so it can order them in such a way that no derivation has to run twice or introduces a glitch.

How that works? See this [in-depth explanation of MobX](https://medium.com/@mweststrate/becoming-fully-reactive-an-in-depth-explanation-of-mobservable-55995262a254).

### Easy interoperability

MobX works with plain javascript structures. Due to its unobtrusiveness it works with most javascript libraries out of the box, without needing MobX specific library flavors.

So you can simply keep using your existing router, data fetching, and utility libraries like `react-router`, `director`, `superagent`, `lodash` etc.

For the same reason you can use it out of the box both server and client side, in isomorphic applications and with react-native.

The result of this is that you often need to learn less new concepts when using MobX in comparison to other state management solutions.

---

## Credits

MobX is inspired by reactive programming principles as found in spreadsheets. It is inspired by MVVM frameworks like in MeteorJS tracker, knockout and Vue.js. But MobX brings Transparent Functional Reactive Programming to the next level and provides a stand alone implementation. It implements TFRP in a glitch-free, synchronous, predictable and efficient manner.

A ton of credits for [Mendix](https://github.com/mendix), for providing the flexibility and support to maintain MobX and the chance to proof the philosophy of MobX in a real, complex, performance critical applications.

And finally kudos for all the people that believed in, tried, validated and even [sponsored](https://github.com/mobxjs/mobx/blob/master/sponsors.md) MobX.

## Further resources and documentation

-   <i><a style="color: white; background:green;padding:5px;margin:5px;border-radius:2px" href="https://egghead.io/courses/manage-complex-state-in-react-apps-with-mobx">egghead.io course</a></i>
-   [Ten minute, interactive MobX + React tutorial](https://mobx.js.org/getting-started)
-   <img src="assets/book.jpg" height="80px"/> [The MobX book](https://books.google.nl/books?id=ALFmDwAAQBAJ&pg=PP1&lpg=PP1&dq=michel+weststrate+mobx+quick+start+guide:+supercharge+the+client+state+in+your+react+apps+with+mobx&source=bl&ots=D460fxti0F&sig=ivDGTxsPNwlOjLHrpKF1nweZFl8&hl=nl&sa=X&ved=2ahUKEwiwl8XO--ncAhWPmbQKHWOYBqIQ6AEwAnoECAkQAQ#v=onepage&q=michel%20weststrate%20mobx%20quick%20start%20guide%3A%20supercharge%20the%20client%20state%20in%20your%20react%20apps%20with%20mobx&f=false) by Pavan Podila and Michel Weststrate (which despite its name is in-depth!)
-   [Official MobX 4 documentation and API overview](https://mobxjs.github.io/mobx/refguide/api.html) ([MobX 3](https://github.com/mobxjs/mobx/blob/54557dc319b04e92e31cb87427bef194ec1c549c/docs/refguide/api.md), [MobX 2](https://github.com/mobxjs/mobx/blob/7c9e7c86e0c6ead141bb0539d33143d0e1f576dd/docs/refguide/api.md))
-   Videos:
    -   [ReactNext 2016: Real World MobX](https://www.youtube.com/watch?v=Aws40KOx90U) - 40m [slides](https://docs.google.com/presentation/d/1DrI6Hc2xIPTLBkfNH8YczOcPXQTOaCIcDESdyVfG_bE/edit?usp=sharing)
    -   [Practical React with MobX](https://www.youtube.com/watch?v=XGwuM_u7UeQ). In depth introduction and explanation to MobX and React by Matt Ruby on OpenSourceNorth (ES5 only) - 42m.
    -   LearnCode.academy MobX tutorial [Part I: MobX + React is AWESOME (7m)](https://www.youtube.com/watch?v=_q50BXqkAfI) [Part II: Computed Values and Nested/Referenced Observables (12m.)](https://www.youtube.com/watch?v=nYvNqKrl69s)
    -   [Screencast: intro to MobX](https://www.youtube.com/watch?v=K8dr8BMU7-8) - 8m
    -   [Talk: State Management Is Easy, React Amsterdam 2016 conf](https://www.youtube.com/watch?v=ApmSsu3qnf0&feature=youtu.be) ([slides](https://speakerdeck.com/mweststrate/state-management-is-easy-introduction-to-mobx))
-   Boilerplates [MobX awesome list](https://github.com/mobxjs/awesome-mobx#boilerplates)
-   Related projects [MobX awesome list](https://github.com/mobxjs/awesome-mobx#related-projects-and-utilities)
-   More tutorials, blogs, videos, and other helpful resources can be found on the [MobX awesome list](https://github.com/mobxjs/awesome-mobx#awesome-mobx)
-   <img src="assets/book.jpg" height="80px"/> [The MobX book](https://books.google.nl/books?id=ALFmDwAAQBAJ&pg=PP1&lpg=PP1&dq=michel+weststrate+mobx+quick+start+guide:+supercharge+the+client+state+in+your+react+apps+with+mobx&source=bl&ots=D460fxti0F&sig=ivDGTxsPNwlOjLHrpKF1nweZFl8&hl=nl&sa=X&ved=2ahUKEwiwl8XO--ncAhWPmbQKHWOYBqIQ6AEwAnoECAkQAQ#v=onepage&q=michel%20weststrate%20mobx%20quick%20start%20guide%3A%20supercharge%20the%20client%20state%20in%20your%20react%20apps%20with%20mobx&f=false) by Pavan Podila and Michel Weststrate (which despite its name is in-depth!)
-   [MobX homepage](http://mobxjs.github.io)
-   [API overview](http://mobxjs.github.io/mobx/refguide/api.html)
-   [Tutorials](https://github.com/mobxjs/awesome-mobx#tutorials)
-   [Blogs](https://github.com/mobxjs/awesome-mobx#blogs)
-   [Videos](https://github.com/mobxjs/awesome-mobx#videos)
-   [Boilerplates](https://github.com/mobxjs/awesome-mobx#boilerplates)
-   [MobX awesome list](https://github.com/mobxjs/awesome-mobx#awesome-mobx)

## What others are saying...

> Guise, #mobx isn't pubsub, or your grandpa's observer pattern. Nay, it is a carefully orchestrated observable dimensional portal fueled by the power cosmic. It doesn't do change detection, it's actually a level 20 psionic with soul knife, slashing your viewmodel into submission.

> After using #mobx for lone projects for a few weeks, it feels awesome to introduce it to the team. Time: 1/2, Fun: 2X

> Working with #mobx is basically a continuous loop of me going “this is way too simple, it definitely won’t work” only to be proven wrong

> Try react-mobx with es6 and you will love it so much that you will hug someone.

> I have built big apps with MobX already and comparing to the one before that which was using Redux, it is simpler to read and much easier to reason about.

> The #mobx is the way I always want things to be! It's really surprising simple and fast! Totally awesome! Don't miss it!

## Contributing

-   Feel free to send small pull requests. Please discuss new features or big changes in a GitHub issue first.
-   Use `npm test` to run the basic test suite, `npm run coverage` for the test suite with coverage and `npm run test:performance` for the performance tests.

## Donating

Was MobX key in making your project a success?
Join our [open collective](https://opencollective.com/mobx#)! Thank you to our existing [backers and sponsors](backers-sponsors.md).
