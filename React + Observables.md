React + Observables

Webmodeler client architecture

React
Hipster library to 'create' html
// URL

- Not a framework
- Couples UI, events and logic, anti templates
- No name duplication, no UserIsSystemAdminOrProjectMemberWithDeployRights, clear usage patterns
- loops, expressions, functions, etc..
- can be typed statically

What is in it?
- Events
- JSX (html in javascript)
- Components
- Virtual DOM

Compontents
- render function (synchronous, side effect free). Defined in terms of
- props (final, like widget configuration)
- state (internal, like private members, data)
- life cycle events (componentDidMount, componentWillUnmount ...)
- components are 'final' after construction, cannot be accessed by anyone!
- .. but can talk to outside world
- React manages, construction, destruction

Why?
- Clear data flow: always from parent to child
- child never depends on parent
- Easy to test, debug, comprehend, reuse
- State changes start at root, re-render complete components
- Slow? Virtual DOM!
- Similar to render pipeline in 3D engines

Too good to be true?
- Indeed, states tend to crawl upward until it is all at the root
- Tada: Flux
- Separate state into view-state and model
- Model in stores
- Model is changed by sending actions to dispatcher
- Components subscribe to events in stores to get updates
- ... boilerplate

Observables
- Like reactive programming (but no streams)
- Observable values, functions, arrays
- Used in frameworks like knockout and ember
- Implicit dependency tree
- Update-on-write


class Order {
	@observable price:number = 3;
	@observable amount:number = 2;
	@observable orders = [];

	@observable total() {
		return this.amount * this.price * (1 + this.orders.length);
	}
}


currentlyCalculating:Stack;

value.get() = this.addObserver(currentlyCalculating.peek()); return _value;
value.set(newValue) = _value = newValue; notifyAllObservers();

computed.get() =  {
	this.addObserver(currentlyCalculating);
	currentlyCalculating.push(this);
	_value = compute();
	currentlyCalculating.pop(this);
	notifyAllObservers;
}


React + Observables

component.render = return mobservable.watch(realReanderFunction, this.forceUpdate)
component.willUnmount = observable.dispose()

Entity.render

Association.render




Demo



