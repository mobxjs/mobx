var m = require('../');
var test = require('tape');

test('cascading active state (form 1)', function(t) {
  var Store = function() {
    m.extendObservable(this, {_activeItem: null});
  }
  Store.prototype.activeItem = function(item) {
    var _this = this;

    if (arguments.length === 0) return this._activeItem;

    m.transaction(function() {
      if (_this._activeItem === item) return;
      if (_this._activeItem) _this._activeItem.isActive = false;
      _this._activeItem = item;
      if (_this._activeItem) _this._activeItem.isActive = true;
    });
  }

  var Item = function() {
    m.extendObservable(this, {isActive: false});
  }

  var store = new Store();
  var item1 = new Item(), item2 = new Item();
  t.equal(store.activeItem(), null);
  t.equal(item1.isActive, false);
  t.equal(item2.isActive, false);

  store.activeItem(item1);
  t.equal(store.activeItem(), item1);
  t.equal(item1.isActive, true);
  t.equal(item2.isActive, false);

  store.activeItem(item2);
  t.equal(store.activeItem(), item2);
  t.equal(item1.isActive, false);
  t.equal(item2.isActive, true);

  store.activeItem(null);
  t.equal(store.activeItem(), null);
  t.equal(item1.isActive, false);
  t.equal(item2.isActive, false);

  t.end();
});

test('cascading active state (form 2)', function(t) {
  var Store = function() {
    var _this = this;
    m.extendObservable(this, {activeItem: null});

    m.autorun(function() {
      if (_this._activeItem === _this.activeItem) return;
      if (_this._activeItem) _this._activeItem.isActive = false;
      _this._activeItem = _this.activeItem;
      if (_this._activeItem) _this._activeItem.isActive = true;
    });
  }

  var Item = function() {
    m.extendObservable(this, {isActive: false});
  }

  var store = new Store();
  var item1 = new Item(), item2 = new Item();
  t.equal(store.activeItem, null);
  t.equal(item1.isActive, false);
  t.equal(item2.isActive, false);

  store.activeItem = item1;
  t.equal(store.activeItem, item1);
  t.equal(item1.isActive, true);
  t.equal(item2.isActive, false);

  store.activeItem = item2;
  t.equal(store.activeItem, item2);
  t.equal(item1.isActive, false);
  t.equal(item2.isActive, true);

  store.activeItem = null;
  t.equal(store.activeItem, null);
  t.equal(item1.isActive, false);
  t.equal(item2.isActive, false);

  t.end();
});
