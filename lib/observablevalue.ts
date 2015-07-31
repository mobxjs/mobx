namespace mobservable {

    export function reference(value?) {
        return new _.ObservableValue(value).createGetterSetter();
    }
    export var primitive = reference;

    export namespace _ {
        export class ObservableValue<T> {
            protected changeEvent = new SimpleEventEmitter();
            protected dependencyState:DNode = new DNode(this);
    
            constructor(protected _value?:T){
            }
    
            set(value:T) {
                if (value !== this._value) {
                    var oldValue = this._value;
                    this.dependencyState.markStale();
                    this._value = value;
                    this.dependencyState.markReady(true);
                    this.changeEvent.emit(value, oldValue);
                }
            }
    
            get():T {
                this.dependencyState.notifyObserved();
                return this._value;
            }
    
            observe(listener:(newValue:T, oldValue:T)=>void, fireImmediately=false):Lambda {
                this.dependencyState.setRefCount(+1); // awake
                if (fireImmediately)
                    listener(this.get(), undefined);
                var disposer = this.changeEvent.on(listener);
                return once(() => {
                    this.dependencyState.setRefCount(-1);
                    disposer();
                });
            }
    
            createGetterSetter():Mobservable.IObservableValue<T> {
                var self = this;
                var f:any = function(value?) {
                    if (arguments.length > 0)
                        self.set(value);
                    else
                        return self.get();
                };
                f.impl = this;
                f.observe = function(listener, fire) {
                    return self.observe(listener, fire);
                }
                f.toString = function() {
                    return self.toString();
                }
                return f;
            }
    
            toString() {
                return `Observable[${this._value}]`;
            }
        }
    }
}