---
sidebar_label: Using trace for debugging
title: Using `trace` for debugging
hide_title: true
---

# Using `trace` for debugging

Trace is a small utility that helps to find out why your computed values, reactions or components are re-evaluating.

It can be used by simply importing `import { trace } from "mobx"`, and then put it inside a reaction or computed value.
It will print why it is re-evaluating the current derivation.

Optionally it is possible to automatically enter the debugger by passing `true` as last argument.
This way the exact mutation that causes the reaction to re-run is still in stack, usually ~8 stack frames up. See the image below.

In debugger mode, the debug information will also reveal the full derivation tree that is affecting the current computation / reaction.

![trace](../assets/trace-tips2.png)

![trace](../assets/trace.gif)

## Live examples

Simple codesandbox trace example: https://codesandbox.io/s/nr58ylyn4m

Here's a deployed example for exploring the stack: https://csb-nr58ylyn4m-hontnuliaa.now.sh/
Be sure to play with chrome debugger's blackbox feature!

## Usage examples

There are different ways of calling `trace()`, some examples:

```javascript
import { observer } from "mobx-react"
import { trace } from "mobx"

const MyComponent = observer(() => {
    trace(true) // enter the debugger whenever an observable value causes this component to re-run
    return <div>{this.props.user.name}</name>
})
```

Enable trace by using the `reaction` argument of an reaction / autorun:

```javascript
mobx.autorun("loggerzz", reaction => {
    reaction.trace()
    console.log(user.fullname)
})
```

Pass in the property name of a computed property:

```javascript
trace(user, "fullname")
```
