---
sidebar_label: MobX + React DevTools
title: MobX + React DevTools
---

<div id='codefund' style='float:right'></div>

# MobX + React DevTools

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
