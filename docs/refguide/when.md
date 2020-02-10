---
title: when
sidebar_label: when
hide_title: true
---

# when

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

<details>
    <summary style="color: white; background:green;padding:5px;margin:5px;border-radius:2px">egghead.io lesson 9: custom reactions</summary>
    <br />
    <div style="padding:5px;">
        <iframe style="border: none;" width=760 height=427  src="https://egghead.io/lessons/react-write-custom-mobx-reactions-with-when-and-autorun/embed" ></iframe>
    </div>
    <a style="font-style:italic;padding:5px;margin:5px;"  href="https://egghead.io/lessons/react-write-custom-mobx-reactions-with-when-and-autorun">Hosted on egghead.io</a>
</details>

`when(predicate: () => boolean, effect?: () => void, options?)`

`when` observes & runs the given `predicate` until it returns true.
Once that happens, the given `effect` is executed and the autorunner is disposed.
The function returns a disposer to cancel the autorunner prematurely.

This function is really useful to dispose or cancel stuff in a reactive way.
For example:

```javascript
class MyResource {
    constructor() {
        when(
            // once...
            () => !this.isVisible,
            // ... then
            () => this.dispose()
        )
    }

    @computed get isVisible() {
        // indicate whether this item is visible
    }

    dispose() {
        // dispose
    }
}
```

## when-promise

If there is no `effect` function provided, `when` will return a `Promise`. This combines nicely with `async / await`

```javascript
async function() {
	await when(() => that.isVisible)
	// etc..
}
```
