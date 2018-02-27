# MobX + React DevTools

<a style="color: white; background:green;padding:5px;margin:5px;border-radius:2px" href="https://egghead.io/courses/manage-complex-state-in-react-apps-with-mobx">egghead.io lesson 2: devtools</a>


MobX ships with DevTools that can be used to track the rendering behavior and data depenencies of your app.

![devtools](../images/devtools.gif)

## Usage:

Install:

`npm install mobx-react-devtools`

To enable devtools, import and render the devtools somewhere in your code-base.

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
