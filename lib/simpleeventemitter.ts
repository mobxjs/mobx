namespace mobservable {

    export class SimpleEventEmitter {
        listeners:{(data?):void}[] = [];

        emit(...data:any[]);
        emit() {
            var listeners = this.listeners.slice();
            var l = listeners.length;
            switch (arguments.length) {
                case 0:
                    for(var i = 0; i < l; i++)
                        listeners[i]();
                    break;
                case 1:
                    var data = arguments[0];
                    for(var i = 0; i < l; i++)
                        listeners[i](data);
                    break;
                default:
                    for(var i = 0; i < l; i++)
                        listeners[i].apply(null, arguments);
            }
        }

        on(listener:(...data:any[])=>void):Lambda {
            this.listeners.push(listener);
            return once(() => {
                var idx = this.listeners.indexOf(listener);
                if (idx !== -1)
                    this.listeners.splice(idx, 1);
            });
        }

        once(listener:(...data:any[])=>void):Lambda {
            var subscription = this.on(function() {
                subscription();
                listener.apply(this, arguments);
            });
            return subscription;
        }
    }
}