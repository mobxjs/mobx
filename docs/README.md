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

---

MobX is made possible by the generosity of the sponsors below, and many [individual backers](http://mobxjs.github.io/mobx/backers-sponsors.html#backers). Sponsoring directly impacts the longevity of this project.

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
<a href="https://www.dcslsoftware.com/"><img src="assets/dcsl.png" align="center" width="100" title="DCSL Software" alt="DCSL Software"/></a>
<a href="https://www.bugsnag.com/platforms/react-error-reporting?utm_source=MobX&utm_medium=Website&utm_content=open-source&utm_campaign=2019-community&utm_term=20190913"><img src="assets/bugsnag.jpg" align="center" width="100" title="Bugsnag" alt="Bugsnag"/></a>
<a href="https://curology.com/blog/tech"><img src="assets/curology.png" align="center" width="100" title="Curology" alt="Curology"/></a>

**🥉Bronze sponsors (\$500+ total contributions):**<br/>
<a href="https://www.algolia.com/"><img src="assets/algolia.jpg" align="center" width="100" title="Algolia" alt="Algolia" /></a>
<a href="https://talentplot.com/"><img src="assets/talentplot.png" align="center" width="100" title="talentplot" alt="talentplot"></a>
<a href="https://careers.dazn.com/"><img src="assets/dazn.png" align="center" width="100" title="DAZN" alt="DAZN"></a>
<a href="https://blokt.com/"><img src="assets/blokt.jpg" align="center" width="100" title="Blokt" alt="Blokt"/></a>

---

## Installation

Installation: `npm install mobx --save`. For the React bindings: `npm install mobx-react --save`.

For more options see the [installation page](intro/installation.md).

## Introduction

MobX is a battle tested library that makes state management simple and scalable by transparently applying functional reactive programming (TFRP).
The philosophy behind MobX is very simple:

_Anything that can be derived from the application state, should be derived. Automatically._

which includes the UI, data serialization, server communication, etc.

<img alt="MobX unidirectional flow" src="assets/flow.png" align="center" />

TODO: clean this up

Easy to read, easy to write. Optimized out of the box.

React and MobX together are a powerful combination. React renders the application state by providing mechanisms to translate it into a tree of renderable components. MobX provides the mechanism to store and update the application state that React then uses.

Both React and MobX provide an optimal and unique solutions to common problems in application development. React provides mechanisms to optimally render UI by using a virtual DOM that reduces the number of costly DOM mutations. MobX provides mechanisms to optimally synchronize application state with your React components by building a reactive dependency tree that is only updated when strictly needed and is never stale. MobX will optimize your React components for you, without needing to specify data dependencies, use `memo`, or refactoring states or contexts to make things optimal.

In fact, with MobX state can be completely separated from your UI layer. This makes testing much simpler and enables code sharing between stacks and frameworks, and leads to a natural separation of concerns.

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

To learn about the core concepts of MobX with a larger example, please read [Concepts & Principles](http://mobxjs.github.io/mobx/intro/concepts.html) or take the [10 minute interactive introduction to MobX and React](https://mobx.js.org/getting-started).
Read on to learn about some of the benefits of using MobX.

## What others are saying...

> Guise, #mobx isn't pubsub, or your grandpa's observer pattern. Nay, it is a carefully orchestrated observable dimensional portal fueled by the power cosmic. It doesn't do change detection, it's actually a level 20 psionic with soul knife, slashing your viewmodel into submission.

> After using #mobx for lone projects for a few weeks, it feels awesome to introduce it to the team. Time: 1/2, Fun: 2X

> Working with #mobx is basically a continuous loop of me going “this is way too simple, it definitely won’t work” only to be proven wrong

> Try react-mobx with es6 and you will love it so much that you will hug someone.

> I have built big apps with MobX already and comparing to the one before that which was using Redux, it is simpler to read and much easier to reason about.

> The #mobx is the way I always want things to be! It's really surprising simple and fast! Totally awesome! Don't miss it!

## The benefits of MobX

TODO: clean this up, and move up, merge with intro section?

MobX is one of the least obtrusive libraries you can use for state management. That makes the `MobX` approach not just simple, but very scalable as well. It has caused many well known companies to adopt MobX, which is used at companies like Microsoft, Amazon, Netflix, EA Games and [many more](https://github.com/mobxjs/mobx/issues/681).

The reason for MobX's popularity boil down to this: _With MobX you write typically less and more straight-forward code, that is better optimized than comparable solutions_. In other words, it maximizes productivity.

-   **Mutable Data < Immutable Data < Observable Data**. Immutability is too often seen as silver bullet in programming. While it is justified in many cases, for stateful data or CRUD operations it is often a mismatch. Re-creating an object just to modify one of its attributes is not only cognitive challenging, it is inefficient as well. It does make change detection easy. But only compared to 'classic' mutable data. Observable data will pick up changes without any diffing. At all. And you will always be looking at the latest version. From anywhere.
-   **Simpler actions are easier to read and maintain**. As demonstrated above, modifying state when using MobX is very straightforward. You write down your intentions imperatively. And MobX will make sure no mutation will goes undetected.
-   **Fine grained observability is efficient**. MobX is a reactive library that builds a graph of all the derivations in your application to find the least number of re-computations that is needed to prevent staleness. By performing runtime analysis it will optimize at a much finer granularity than any programmer would to by hand.
-   **Access any observable anywhere**. If an observable is used in a reactive context, MobX will track it. Regardless how it got there; through a closure, module import, React component prop or context? It doesn't matter. That keeps things simple and guarantees architectural freedom. This doesn't mean that there shouldn't be any limitations on how data is organized. But the limitations shouldn't be driven by the limitations of the state management libraries, but rather by the conceptual design decisions your team makes.
-   **Structure state using any common language construct**. With MobX you don't need to normalize your data. This makes the library very suitable for very complex domain models (At Mendix for example ~500 different domain classes in a single application). MobX has few opinions, so you are free to either use classes or plain old objects. To store direct references or just identifiers.
-   **Easy interoperability**. MobX works with enriched but plain javascript structures. Due to its unobtrusiveness it works with most javascript libraries out of the box, without needing MobX specific flavors. So you can simply keep using promises, async/await, generators, your existing router, data fetching, and utility libraries like `react-router`, `director`, `superagent`, `lodash` etc.
-   **Asynchronous processes aren't special**. They are merely multiple synchronous actions spread over time. Because observable data structures allow you to hold on to references, asynchronous processes aren't more complicated than they should be.

The philosophy and benefits of the mental model provided by MobX are described in detail in the blogs [UI as an afterthought](https://michel.codes/blogs/ui-as-an-afterthought) and [How to decouple state and UI (a.k.a. you don’t need componentWillMount)](https://hackernoon.com/how-to-decouple-state-and-ui-a-k-a-you-dont-need-componentwillmount-cc90b787aa37).

## Further resources and documentation

-   [Ten minute, interactive MobX + React tutorial](https://mobx.js.org/getting-started)
-   <i><a style="color: white; background:green;padding:5px;margin:5px;border-radius:2px" href="https://egghead.io/courses/manage-complex-state-in-react-apps-with-mobx">egghead.io course</a></i> (Based on MobX 3)
-   <img src="assets/book.jpg" height="80px"/> [The MobX book](https://books.google.nl/books?id=ALFmDwAAQBAJ&pg=PP1&lpg=PP1&dq=michel+weststrate+mobx+quick+start+guide:+supercharge+the+client+state+in+your+react+apps+with+mobx&source=bl&ots=D460fxti0F&sig=ivDGTxsPNwlOjLHrpKF1nweZFl8&hl=nl&sa=X&ved=2ahUKEwiwl8XO--ncAhWPmbQKHWOYBqIQ6AEwAnoECAkQAQ#v=onepage&q=michel%20weststrate%20mobx%20quick%20start%20guide%3A%20supercharge%20the%20client%20state%20in%20your%20react%20apps%20with%20mobx&f=false) by Pavan Podila and Michel Weststrate.
-   Videos:
    -   [Introduction to MobX & React in 2020](https://www.youtube.com/watch?v=pnhIJA64ByY) - 17m by Leigh Halliday.
    -   [ReactNext 2016: Real World MobX](https://www.youtube.com/watch?v=Aws40KOx90U) - 40m [slides](https://docs.google.com/presentation/d/1DrI6Hc2xIPTLBkfNH8YczOcPXQTOaCIcDESdyVfG_bE/edit?usp=sharing)
    -   [Practical React with MobX](https://www.youtube.com/watch?v=XGwuM_u7UeQ). In depth introduction and explanation to MobX and React by Matt Ruby on OpenSourceNorth (ES5 only) - 42m.
    -   [MobX and the unique symbiosis of predictability and speed](https://www.youtube.com/watch?v=NBYbBbjZeX4&list=PL8sJahqnzh8JJD7xahG5zXkjfM5GOgcPA&index=21&t=0s) - HolyJS 2019 conf, 59 min
    -   [Talk: State Management Is Easy, React Amsterdam 2016 conf](https://www.youtube.com/watch?v=ApmSsu3qnf0&feature=youtu.be) ([slides](https://speakerdeck.com/mweststrate/state-management-is-easy-introduction-to-mobx))
-   [MobX awesome list](https://github.com/mobxjs/awesome-mobx#awesome-mobx)

## Credits

MobX is inspired by reactive programming principles as found in spreadsheets. It is inspired by MVVM frameworks like in MeteorJS tracker, knockout and Vue.js. But MobX brings Transparent Functional Reactive Programming to the next level and provides a stand alone implementation. It implements TFRP in a glitch-free, synchronous, predictable and efficient manner.

A ton of credits for [Mendix](https://github.com/mendix), for providing the flexibility and support to maintain MobX and the chance to proof the philosophy of MobX in a real, complex, performance critical applications.
