---
sidebar_label: Provider / inject
title: provider_inject
hide_title: true
---

# Provider / inject

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

<a style="color: white; background:green;padding:5px;margin:5px;border-radius:2px" href="https://egghead.io/lessons/react-connect-mobx-observer-components-to-the-store-with-the-react-provider">egghead.io lesson 8: inject stores with Provider</a>

_Warning: It is recommended to use `React.createContext` instead! It provides generally the same functionality, and Provider / inject is mostly around for legacy reasons_

The `mobx-react` package provides the `Provider` component that can be used to pass down stores using React's context mechanism.
To connect to those stores, pass a list of store names to `inject`, which will make the stores available as props.

Example:

```javascript
const colors = observable({
   foreground: '#000',
   background: '#fff'
});

const App = () =>
  <Provider colors={colors}>
     <app stuff... />
  </Provider>;

const Button = inject("colors")(observer(({ colors, label, onClick }) =>
  <button style={{
      color: colors.foreground,
      backgroundColor: colors.background
    }}
    onClick={onClick}
  >{label}</button>
));

// later..
colors.foreground = 'blue';
// all buttons updated
```

See for more information the [`mobx-react` docs](https://github.com/mobxjs/mobx-react#provider-and-inject).
