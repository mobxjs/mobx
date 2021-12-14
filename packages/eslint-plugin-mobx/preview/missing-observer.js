/* eslint mobx/missing-observer: "error" */

function Named() { }
const foo = function Named() { }
const Anonym = function () { };
const Arrow = () => { };

observer(function Named() { });
const foo = observer(function Named() { })
const Anonym = observer(function () { });
const Arrow = observer(() => { });

function notCmp() { }
const notCmp = function notCmp() { }
const notCmp = function () { }
const notCmp = () => { }

class Cmp extends React.Component { }
class Cmp extends Component { }
const Cmp = class extends React.Component { }
const Cmp = class extends Component { }
class extends Component { }
class extends React.Component { }

class NotCmp { }
class NotCmp extends Foo { }
class NotCmp extends React.Foo { }

const Cmp = observer(class Cmp extends React.Component { })
const Cmp = observer(class Cmp extends Component { })
const Cmp = observer(class extends React.Component { })
const Cmp = observer(class extends Component { })