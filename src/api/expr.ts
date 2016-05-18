import {computed} from "../api/computeddecorator";
import {isComputingDerivation} from "../core/derivation";

/**
	* expr can be used to create temporarily views inside views.
	* This can be improved to improve performance if a value changes often, but usually doesn't affect the outcome of an expression.
	* 
	* In the following example the expression prevents that a component is rerender _each time_ the selection changes;
	* instead it will only rerenders when the current todo is (de)selected.
	* 
	* reactiveComponent((props) => {
	*     const todo = props.todo;
	*     const isSelected = mobx.expr(() => props.viewState.selection === todo);
	*     return <div className={isSelected ? "todo todo-selected" : "todo"}>{todo.title}</div>
	* });
	* 
	*/
export function expr<T>(expr: () => T, scope?): T {
	// TODO: deprecate in 3.0? seems to be hardly used..
	if (!isComputingDerivation())
		console.warn("[mobx.expr] 'expr' should only be used inside other reactive functions.");
	// optimization: would be more efficient if the expr itself wouldn't be evaluated first on the next change, but just a 'changed' signal would be fired
	return computed(expr, scope).get();
}
