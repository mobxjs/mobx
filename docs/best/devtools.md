# MobX + React DevTools

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
