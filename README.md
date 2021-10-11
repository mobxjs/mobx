<img src="https://mobx.js.org/assets/mobx.png" alt="logo" height="120" align="right" />

# MobX

_Simple, scalable state management._

[![npm version](https://badge.fury.io/js/mobx.svg)](https://badge.fury.io/js/mobx)
[![OpenCollective](https://opencollective.com/mobx/backers/badge.svg)](docs/backers-sponsors.md#backers)
[![OpenCollective](https://opencollective.com/mobx/sponsors/badge.svg)](docs/backers-sponsors.md#sponsors)

[![Discuss on Github](https://img.shields.io/badge/discuss%20on-GitHub-orange)](https://github.com/mobxjs/mobx/discussions)
[![View changelog](https://img.shields.io/badge/changelogs.xyz-Explore%20Changelog-brightgreen)](https://changelogs.xyz/mobx)

---

> Documentation for older **unsupported** V4/V5 can be [found here](https://github.com/mobxjs/mobx/blob/mobx4and5/docs/README.md), but be sure to read about [current documentation first](https://mobx.js.org/about-this-documentation.html).

MobX is made possible by the generosity of the sponsors below, and many other [individual backers](docs/backers-sponsors.md#backers). Sponsoring directly impacts the longevity of this project.

**🥇 Gold sponsors (\$3000+ total contribution):** <br/>
<a href="https://mendix.com/"><img src="https://mobx.js.org/assets/mendix-logo.png" align="center" width="100" title="Mendix" alt="Mendix" /></a>
<a href="https://frontendmasters.com/"><img src="https://mobx.js.org/assets/frontendmasters.jpg" align="center" width="100" title="Frontend Masters" alt="Frontend Masters"></a>
<a href="https://opensource.facebook.com/"><img src="https://mobx.js.org/assets/fbos.jpeg" align="center" width="100" title="Facebook Open Source" alt="Facebook Open Source" /></a>
<a href="http://auctionfrontier.com/"><img src="https://mobx.js.org/assets/auctionfrontier.jpeg" align="center" width="100" title="Auction Frontier" alt="Auction Frontier"></a>
<a href="https://www.guilded.gg/"><img src="https://mobx.js.org/assets/guilded.jpg" align="center" width="100" title="Guilded" alt="Guilded" /></a>
<a href="https://coinbase.com/"><img src="https://mobx.js.org/assets/coinbase.jpeg" align="center" width="100" title="Coinbase" alt="Coinbase" /></a>
<a href="https://www.canva.com/"><img src="https://mobx.js.org/assets/canva.png" align="center" width="100" title="Canva" alt="Canva" /></a>

**🥈 Silver sponsors (\$100+ per month):**<br/>
<a href="https://www.codefirst.co.uk/"><img src="https://mobx.js.org/assets/codefirst.png" align="center" width="100" title="CodeFirst" alt="CodeFirst"/></a>
<a href="https://www.dcsl.com/"><img src="https://mobx.js.org/assets/dcsl.png" align="center" width="100" title="DCSL Guidesmiths" alt="DCSL Guidesmiths"/></a>
<a href="https://www.bugsnag.com/platforms/react-error-reporting?utm_source=MobX&utm_medium=Website&utm_content=open-source&utm_campaign=2019-community&utm_term=20190913"><img src="https://mobx.js.org/assets/bugsnag.jpg" align="center" width="100" title="Bugsnag" alt="Bugsnag"/></a>
<a href="https://curology.com/blog/tech"><img src="https://mobx.js.org/assets/curology.png" align="center" width="100" title="Curology" alt="Curology"/></a>
<a href="https://modulz.app/"><img src="https://mobx.js.org/assets/modulz.png" align="center" width="100" title="Modulz" alt="Modulz"/></a>
<a href="https://space307.com/?utm_source=sponsorship&utm_medium=mobx&utm_campaign=readme"><img src="https://mobx.js.org/assets/space307.png" align="center" width="100" title="Space307" alt="Space307"/></a>

**🥉 Bronze sponsors (\$500+ total contributions):**<br/>
<a href="https://mantro.net/jobs/warlock"><img src="https://mobx.js.org/assets/mantro.png" align="center" width="100" title="mantro GmbH" alt="mantro GmbH"></a>
<a href="https://www.algolia.com/"><img src="https://mobx.js.org/assets/algolia.jpg" align="center" width="100" title="Algolia" alt="Algolia" /></a>
<a href="https://talentplot.com/"><img src="https://mobx.js.org/assets/talentplot.png" align="center" width="100" title="talentplot" alt="talentplot"></a>
<a href="https://careers.dazn.com/"><img src="https://mobx.js.org/assets/dazn.png" align="center" width="100" title="DAZN" alt="DAZN"></a>
<a href="https://blokt.com/"><img src="https://mobx.js.org/assets/blokt.jpg" align="center" width="100" title="Blokt" alt="Blokt"/></a>

---

## Introduction

_Anything that can be derived from the application state, should be. Automatically._

MobX is a battle tested library that makes state management simple and scalable by transparently applying functional reactive programming (TFRP).
The philosophy behind MobX is simple:

<div class="benefits">
    <div>
        <div class="pic">😙</div>
        <div>
            <h5>Straightforward</h5>
            <p>Write minimalistic, boilerplate free code that captures your intent.
            Trying to update a record field? Use the good old JavaScript assignment.
            Updating data in an asynchronous process? No special tools are required, the reactivity system will detect all your changes and propagate them out to where they are being used.
            </p>
        </div>
    </div>
    <div>
        <div class="pic">🚅</div>
        <div>
            <h5>Effortless optimal rendering</h5>
            <p>
                All changes to and uses of your data are tracked at runtime, building a dependency tree that captures all relations between state and output.
                This guarantees that computations depending on your state, like React components, run only when strictly needed.
                There is no need to manually optimize components with error-prone and sub-optimal techniques like memoization and selectors.
            </p>
        </div>
    </div>
    <div>
        <div class="pic">🤹🏻‍♂️</div>
        <div>
            <h5>Architectural freedom</h5>
            <p>
                MobX is unopinionated and allows you to manage your application state outside of any UI framework.
                This makes your code decoupled, portable, and above all, easily testable.
            </p>
        </div>
    </div>
</div>

## A quick example

So what does code that uses MobX look like?

```javascript
import React from "react"
import ReactDOM from "react-dom"
import { makeAutoObservable } from "mobx"
import { observer } from "mobx-react"

// Model the application state.
class Timer {
    secondsPassed = 0

    constructor() {
        makeAutoObservable(this)
    }

    increase() {
        this.secondsPassed += 1
    }

    reset() {
        this.secondsPassed = 0
    }
}

const myTimer = new Timer()

// Build a "user interface" that uses the observable state.
const TimerView = observer(({ timer }) => (
    <button onClick={() => timer.reset()}>Seconds passed: {timer.secondsPassed}</button>
))

ReactDOM.render(<TimerView timer={myTimer} />, document.body)

// Update the 'Seconds passed: X' text every second.
setInterval(() => {
    myTimer.increase()
}, 1000)
```

The `observer` wrapper around the `TimerView` React component, will automatically detect that rendering
depends on the `timer.secondsPassed` observable, even though this relationship is not explicitly defined. The reactivity system will take care of re-rendering the component when _precisely that_ field is updated in the future.

Every event (`onClick` / `setInterval`) invokes an _action_ (`myTimer.increase` / `myTimer.reset`) that updates _observable state_ (`myTimer.secondsPassed`).
Changes in the observable state are propagated precisely to all _computations_ and _side effects_ (`TimerView`) that depend on the changes being made.

<img alt="MobX unidirectional flow" src="https://mobx.js.org/assets/flow2.png" align="center" />

This conceptual picture can be applied to the above example, or any other application using MobX.

To learn about the core concepts of MobX using a larger example, check out [The gist of MobX](https://mobx.js.org/the-gist-of-mobx.html) section, or take the [10 minute interactive introduction to MobX and React](https://mobx.js.org/getting-started).
The philosophy and benefits of the mental model provided by MobX are also described in great detail in the blog posts [UI as an afterthought](https://michel.codes/blogs/ui-as-an-afterthought) and [How to decouple state and UI (a.k.a. you don’t need componentWillMount)](https://hackernoon.com/how-to-decouple-state-and-ui-a-k-a-you-dont-need-componentwillmount-cc90b787aa37).

<div class="cheat"><a href="https://gum.co/fSocU"><button title="Download the MobX 6 cheat sheet and sponsor the project">Download the MobX 6 cheat sheet</button></a></div>

## What others are saying...

> Guise, #mobx isn't pubsub, or your grandpa's observer pattern. Nay, it is a carefully orchestrated observable dimensional portal fueled by the power cosmic. It doesn't do change detection, it's actually a level 20 psionic with soul knife, slashing your viewmodel into submission.

> After using #mobx for lone projects for a few weeks, it feels awesome to introduce it to the team. Time: 1/2, Fun: 2X

> Working with #mobx is basically a continuous loop of me going “this is way too simple, it definitely won’t work” only to be proven wrong

> I have built big apps with MobX already and comparing to the one before that which was using Redux, it is simpler to read and much easier to reason about.

> The #mobx is the way I always want things to be! It's really surprising simple and fast! Totally awesome! Don't miss it!

## Further resources and documentation

-   [MobX cheat sheet (also sponsors the project)](https://gum.co/fSocU)
-   [10 minute interactive introduction to MobX and React](https://mobx.js.org/getting-started)
-   [Egghead.io course, based on MobX 3](https://egghead.io/courses/manage-complex-state-in-react-apps-with-mobx)

### The MobX book

[<img src="https://mobx.js.org/assets/book.jpg" height="80px"/> ](https://books.google.nl/books?id=ALFmDwAAQBAJ&pg=PP1&lpg=PP1&dq=michel+weststrate+mobx+quick+start+guide:+supercharge+the+client+state+in+your+react+apps+with+mobx&source=bl&ots=D460fxti0F&sig=ivDGTxsPNwlOjLHrpKF1nweZFl8&hl=nl&sa=X&ved=2ahUKEwiwl8XO--ncAhWPmbQKHWOYBqIQ6AEwAnoECAkQAQ#v=onepage&q=michel%20weststrate%20mobx%20quick%20start%20guide%3A%20supercharge%20the%20client%20state%20in%20your%20react%20apps%20with%20mobx&f=false)

Created by [Pavan Podila](https://twitter.com/pavanpodila) and [Michel Weststrate](https://twitter.com/mweststrate).

### Videos

-   [Introduction to MobX & React in 2020](https://www.youtube.com/watch?v=pnhIJA64ByY) by Leigh Halliday, _17min_.
-   [ReactNext 2016: Real World MobX](https://www.youtube.com/watch?v=Aws40KOx90U) by Michel Weststrate, _40min_, [slides](https://docs.google.com/presentation/d/1DrI6Hc2xIPTLBkfNH8YczOcPXQTOaCIcDESdyVfG_bE/edit?usp=sharing).
-   [CityJS 2020: MobX, from mutable to immutable, to observable data](https://www.youtube.com/watch?v=ZHxFrbK3VB0&feature=emb_logo) by Michel Weststrate, _30min_.
-   [OpenSourceNorth: Practical React with MobX (ES5)](https://www.youtube.com/watch?v=XGwuM_u7UeQ) by Matt Ruby, _42min_.
-   [HolyJS 2019: MobX and the unique symbiosis of predictability and speed](https://www.youtube.com/watch?v=NBYbBbjZeX4&list=PL8sJahqnzh8JJD7xahG5zXkjfM5GOgcPA&index=21&t=0s) by Michel Weststrate, _59min_.
-   [React Amsterdam 2016: State Management Is Easy](https://www.youtube.com/watch?v=ApmSsu3qnf0&feature=youtu.be) by Michel Weststrate, _20min_, [slides](https://speakerdeck.com/mweststrate/state-management-is-easy-introduction-to-mobx).
-   {🚀} [React Live 2019: Reinventing MobX](https://www.youtube.com/watch?v=P_WqKZxpX8g) by Max Gallo, _27min_.

And an all around [MobX awesome list](https://github.com/mobxjs/awesome-mobx#awesome-mobx).

## Credits

MobX is inspired by reactive programming principles as found in the spreadsheets. It is inspired by MVVM frameworks like MeteorJS tracker, knockout and Vue.js, but MobX brings _Transparent Functional Reactive Programming_ to the next level and provides a standalone implementation. It implements TFRP in a glitch-free, synchronous, predictable and efficient manner.

A ton of credits goes to [Mendix](https://github.com/mendix), for providing the flexibility and support to maintain MobX and the chance to proof the philosophy of MobX in a real, complex, performance critical applications.
