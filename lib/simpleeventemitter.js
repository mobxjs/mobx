var utils_1 = require('./utils');
var SimpleEventEmitter = (function () {
    function SimpleEventEmitter() {
        this.listeners = [];
    }
    SimpleEventEmitter.prototype.emit = function () {
        var listeners = this.listeners.slice();
        var l = listeners.length;
        switch (arguments.length) {
            case 0:
                for (var i = 0; i < l; i++)
                    listeners[i]();
                break;
            case 1:
                var data = arguments[0];
                for (var i = 0; i < l; i++)
                    listeners[i](data);
                break;
            default:
                for (var i = 0; i < l; i++)
                    listeners[i].apply(null, arguments);
        }
    };
    SimpleEventEmitter.prototype.on = function (listener) {
        var _this = this;
        this.listeners.push(listener);
        return utils_1.once(function () {
            var idx = _this.listeners.indexOf(listener);
            if (idx !== -1)
                _this.listeners.splice(idx, 1);
        });
    };
    SimpleEventEmitter.prototype.once = function (listener) {
        var subscription = this.on(function () {
            subscription();
            listener.apply(this, arguments);
        });
        return subscription;
    };
    return SimpleEventEmitter;
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SimpleEventEmitter;
