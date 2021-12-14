/* eslint mobx/no-anonymous-observer: "error" */

observer(() => { });
observer(function () { });
observer(class { });

const Cmp = observer(() => { });
const Cmp = observer(function () { });
const Cmp = observer(class { });

observer(function Name() { });
observer(class Name { });