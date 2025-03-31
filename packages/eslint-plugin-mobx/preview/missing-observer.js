/* eslint mobx/missing-observer: "error" */

function Named() {}
const named = function Named() {}
const namedRef = forwardRef(function Named() {})
const Anonym = function () {}
const AnonymRef = forwardRef(function () {})
const Arrow = () => {}
const ArrowRef = forwardRef(() => {})

observer(function Named() {})
observer(forwardRef(function Named() {}))
const namedObs = observer(function Named() {})
const namedRefObs = observer(forwardRef(function Named() {}))
const AnonymObs = observer(function () {})
const AnonymRefObs = observer(forwardRef(function () {}))
const ArrowObs = observer(() => {})
const ArrowRefObs = observer(forwardRef(() => {}))

function notCmp() {}
const notCmp = function notCmp() {}
const notCmp = function () {}
const notCmp = () => {}
const notCmp = forwardRef(() => {})

class Cmp extends React.Component {}
class Cmp extends Component {}
const Cmp = class extends React.Component {}
const Cmp = class extends Component {}
;(class extends Component {})
;(class extends React.Component {})

class NotCmp {}
class NotCmp extends Foo {}
class NotCmp extends React.Foo {}

const Cmp = observer(class Cmp extends React.Component {})
const Cmp = observer(class Cmp extends Component {})
const Cmp = observer(class extends React.Component {})
const Cmp = observer(class extends Component {})
