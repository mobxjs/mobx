---
sidebar_label: MobX + React DevTools
title: MobX + React DevTools
hide_title: true
---

# MobX + React DevTools

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

<details>
    <summary style="color: white; background:green;padding:5px;margin:5px;border-radius:2px">egghead.io lesson 2: devtools</summary>
    <br />
    <div style="padding:5px;">
        <iframe style="border: none;" width=760 height=427  src="https://egghead.io/lessons/react-analyze-react-components-with-mobx-react-devtools/embed" ></iframe>
    </div>
    <a style="font-style:italic;padding:5px;margin:5px;"  href="https://egghead.io/lessons/react-analyze-react-components-with-mobx-react-devtools">Hosted on egghead.io</a>
</details>

MobX ships with DevTools that can be used to track the rendering behavior and data dependencies of your app.

![devtools](../assets/devtools.gif)

## Usage:

Install:

`npm install mobx-react-devtools`

To enable devtools, import and render the devtools somewhere in your codebase.

```JS
import DevTools from 'mobx-react-devtools'

const App = () => (
  <div>
    ...
    <DevTools />
  </div>
)
```

For more details check the [mobx-react-devtools](https://github.com/mobxjs/mobx-react-devtools) repository.
