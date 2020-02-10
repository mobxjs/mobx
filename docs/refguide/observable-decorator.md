---
title: @observable
sidebar_label: @observable
hide_title: true
---

# @observable

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

<details>
    <summary style="color: white; background:green;padding:5px;margin:5px;border-radius:2px">egghead.io lesson 1: observable & observer</summary>
    <br>
    <div style="padding:5px;">
        <iframe style="border: none;" width=760 height=427  src="https://egghead.io/lessons/javascript-sync-the-ui-with-the-app-state-using-mobx-observable-and-observer-in-react/embed" ></iframe>
    </div>
    <a style="font-style:italic;padding:5px;margin:5px;" href="https://egghead.io/lessons/javascript-sync-the-ui-with-the-app-state-using-mobx-observable-and-observer-in-react">Hosted on egghead.io</a>
</details>

<details>
    <summary style="color: white; background:green;padding:5px;margin:5px;border-radius:2px">egghead.io lesson 4: observable objects & maps</summary>
    <br>
    <div style="padding:5px;">
        <iframe style="border: none;" width=760 height=427  src="https://egghead.io/lessons/react-use-observable-objects-arrays-and-maps-to-store-state-in-mobx/embed" ></iframe>
    </div>
    <a style="font-style:italic;padding:5px;margin:5px;"  href="https://egghead.io/lessons/react-use-observable-objects-arrays-and-maps-to-store-state-in-mobx">Hosted on egghead.io</a>
</details>

Decorator that can be used on ES7- or TypeScript class properties to make them observable.
The `@observable` can be used on instance fields and property getters.
This offers fine-grained control on which parts of your object become observable.

```javascript
import { observable, computed } from "mobx"

class OrderLine {
    @observable price = 0
    @observable amount = 1

    @computed get total() {
        return this.price * this.amount
    }
}
```

If your environment doesn't support decorators or field initializers,
use `decorate` instead (see [decorators](./modifiers.md) for details).
