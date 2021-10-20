import { jsx as _jsx } from 'react/jsx-runtime';
import { isObservable } from 'mobx';
import { getDisplayName, mobxObserverProperty } from './observerClass';

export function checkMissingObserver(type, props) {
  if (__DEV__
    // actual component (not string, etc)
    && type && (typeof type === 'object' || typeof type === 'function')
    // not an observer
    && type[mobxObserverProperty] !== true
  ) {
    // Symbols are not supported by React (non-enumerables presumably neither)
    // https://github.com/facebook/react/issues/7552#issuecomment-806020985
    Object.keys(props).forEach(key => {
      const prop = props[key];
      if (isObservable(prop)) {
        const componentName = getDisplayName(type);
        console.warn(
          `[mobx-react] Prop \`${key}\` is observable, but \`${componentName}\` is not an observer.`
          + `\nEither wrap the component with \`observer\` or use \`toJS\` utility to pass non-observable copy instead, eg:`
          + `\n\`<NotObserver ${key}={toJS(value)} />\``
          + `\nSee: https://mobx.js.org/react-integration.html#dont-pass-observables-into-components-that-arent-observer`
        );
      }
    })
  }
}

export function jsx(type: any, props: any, key: any) {
  checkMissingObserver(type, props);
  return _jsx(type, props, key);
}