namespace mobservable {

    export var ObserverMixin = {
        componentWillMount: function() {
            var baseRender = this.render;
            this.render = function() {
                if (this._watchDisposer)
                    this._watchDisposer();
                var[rendering, disposer] = watch(() => baseRender.call(this), () => {
                    this.forceUpdate();
                });
                this._watchDisposer = disposer;
                return rendering;
            }
        },

        componentWillUnmount: function() {
            if (this._watchDisposer)
                this._watchDisposer();
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

    export function ObservingComponent(componentClass) {
        var baseMount = componentClass.componentWillMount;
        var baseUnmount = componentClass.componentWillUnmount;
        componentClass.prototype.componentWillMount = function() {
            ObserverMixin.componentWillMount.apply(this, arguments);
            return baseMount && baseMount.apply(this, arguments);
        };
        componentClass.prototype.componentWillUnmount = function() {
            ObserverMixin.componentWillUnmount.apply(this, arguments);
            return baseUnmount && baseUnmount.apply(this, arguments);
        };
        componentClass.prototype.shouldComponentUpdate = ObserverMixin.shouldComponentUpdate;
        return componentClass;
    };
}