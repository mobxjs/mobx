/// <reference path="./index.ts" />
namespace mobservable {

    var reactComponentId = 1;

    export var reactiveMixin = {
        componentWillMount: function() {
            var name = (this.displayName || this.constructor.name || "ReactiveComponent") + reactComponentId++;
            var baseRender = this.render;

            this.render = function() {
                if (this._watchDisposer)
                    this._watchDisposer();
                var[rendering, disposer, watch] = observeUntilInvalid(
                    () => baseRender.call(this),
                    () => {
                        this.forceUpdate();
                    }, {
                        object: this,
                        name
                    });
                this.$mobservable = watch;
                this._watchDisposer = disposer;
                return rendering;
            }
        },

        componentWillUnmount: function() {
            if (this._watchDisposer)
                this._watchDisposer();
            delete this._mobservableDNode;
        },

        shouldComponentUpdate: function(nextProps, nextState) {
            // update on any state changes (as is the default)
            if (this.state !== nextState)
                return true;
            // update if props are shallowly not equal, inspired by PureRenderMixin
            var keys = Object.keys(this.props);
            var key;
            if (keys.length !== Object.keys(nextProps).length)
                return true;
            for(var i = keys.length -1; i >= 0, key = keys[i]; i--)
                if (nextProps[key] !== this.props[key])
                    return true;
            return false;
        }
    }

    export function reactiveComponent(componentClass) {
        console.warn("The use of mobservable.reactiveComponent and mobservable.reactiveMixin is deprecated, please use reactiveComponent from the mobservable-react package");

        var target = componentClass.prototype || componentClass; // For React 0.14
        var baseMount = target.componentWillMount;
        var baseUnmount = target.componentWillUnmount;
        target.componentWillMount = function() {
            reactiveMixin.componentWillMount.apply(this, arguments);
            baseMount && baseMount.apply(this, arguments);
        };
        target.componentWillUnmount = function() {
            reactiveMixin.componentWillUnmount.apply(this, arguments);
            baseUnmount && baseUnmount.apply(this, arguments);
        };
        if (!target.shouldComponentUpdate)
            target.shouldComponentUpdate = reactiveMixin.shouldComponentUpdate;
        return componentClass;
    };
}