const m = require("../mobx4")

test("cascading active state (form 1)", function () {
    const Store = function () {
        m.extendObservable(this, { _activeItem: null })
    }
    Store.prototype.activeItem = function (item) {
        const _this = this

        if (arguments.length === 0) return this._activeItem

        m.transaction(function () {
            if (_this._activeItem === item) return
            if (_this._activeItem) _this._activeItem.isActive = false
            _this._activeItem = item
            if (_this._activeItem) _this._activeItem.isActive = true
        })
    }

    const Item = function () {
        m.extendObservable(this, { isActive: false })
    }

    const store = new Store()
    const item1 = new Item(),
        item2 = new Item()
    expect(store.activeItem()).toBe(null)
    expect(item1.isActive).toBe(false)
    expect(item2.isActive).toBe(false)

    store.activeItem(item1)
    expect(store.activeItem()).toBe(item1)
    expect(item1.isActive).toBe(true)
    expect(item2.isActive).toBe(false)

    store.activeItem(item2)
    expect(store.activeItem()).toBe(item2)
    expect(item1.isActive).toBe(false)
    expect(item2.isActive).toBe(true)

    store.activeItem(null)
    expect(store.activeItem()).toBe(null)
    expect(item1.isActive).toBe(false)
    expect(item2.isActive).toBe(false)
})

test("cascading active state (form 2)", function () {
    const Store = function () {
        const _this = this
        m.extendObservable(this, { activeItem: null })

        m.autorun(function () {
            if (_this._activeItem === _this.activeItem) return
            if (_this._activeItem) _this._activeItem.isActive = false
            _this._activeItem = _this.activeItem
            if (_this._activeItem) _this._activeItem.isActive = true
        })
    }

    const Item = function () {
        m.extendObservable(this, { isActive: false })
    }

    const store = new Store()
    const item1 = new Item(),
        item2 = new Item()
    expect(store.activeItem).toBe(null)
    expect(item1.isActive).toBe(false)
    expect(item2.isActive).toBe(false)

    store.activeItem = item1
    expect(store.activeItem).toBe(item1)
    expect(item1.isActive).toBe(true)
    expect(item2.isActive).toBe(false)

    store.activeItem = item2
    expect(store.activeItem).toBe(item2)
    expect(item1.isActive).toBe(false)
    expect(item2.isActive).toBe(true)

    store.activeItem = null
    expect(store.activeItem).toBe(null)
    expect(item1.isActive).toBe(false)
    expect(item2.isActive).toBe(false)
})

test("emulate rendering", function () {
    let renderCount = 0

    const Component = function (props) {
        this.props = props
    }
    Component.prototype.destroy = function () {
        if (this.handler) {
            this.handler()
            this.handler = null
        }
    }

    Component.prototype.render = function () {
        const _this = this

        if (this.handler) {
            this.handler()
            this.handler = null
        }
        this.handler = m.autorun(function () {
            if (!_this.props.data.title) _this.props.data.title = "HELLO"
            renderCount++
        })
    }

    const data = {}
    m.extendObservable(data, { title: null })
    const component = new Component({ data: data })
    expect(renderCount).toBe(0)

    component.render()
    expect(renderCount).toBe(1)

    data.title = "WORLD"
    expect(renderCount).toBe(2)

    data.title = null
    // Note that this causes two invalidations
    // however, the real mobx-react binding optimizes this as well
    // see mobx-react #12, so maybe this ain't the best test
    expect(renderCount).toBe(4)

    data.title = "WORLD"
    expect(renderCount).toBe(5)

    component.destroy()
    data.title = "HELLO"
    expect(renderCount).toBe(5)
})

test("efficient selection", function () {
    function Item(value) {
        m.extendObservable(this, {
            selected: false,
            value: value
        })
    }

    function Store() {
        this.prevSelection = null
        m.extendObservable(this, {
            selection: null,
            items: [new Item(1), new Item(2), new Item(3)]
        })
        m.autorun(() => {
            if (this.previousSelection === this.selection) return true // converging condition
            if (this.previousSelection) this.previousSelection.selected = false
            if (this.selection) this.selection.selected = true
            this.previousSelection = this.selection
        })
    }

    const store = new Store()

    expect(store.selection).toBe(null)
    expect(
        store.items.filter(function (i) {
            return i.selected
        }).length
    ).toBe(0)

    store.selection = store.items[1]
    expect(
        store.items.filter(function (i) {
            return i.selected
        }).length
    ).toBe(1)
    expect(store.selection).toBe(store.items[1])
    expect(store.items[1].selected).toBe(true)

    store.selection = store.items[2]
    expect(
        store.items.filter(function (i) {
            return i.selected
        }).length
    ).toBe(1)
    expect(store.selection).toBe(store.items[2])
    expect(store.items[2].selected).toBe(true)

    store.selection = null
    expect(
        store.items.filter(function (i) {
            return i.selected
        }).length
    ).toBe(0)
    expect(store.selection).toBe(null)
})
