var m = require("../../")
var TransformUtils = require("./utils/transform")

test("transform1", function() {
    m.extras.resetGlobalState()
    var todoCalc = 0
    var stateCalc = 0
    var state = m.observable({
        todos: [
            {
                title: "coffee"
            }
        ],
        name: "michel"
    })

    var mapped
    var unloaded = []

    var transformState = m.createTransformer(function(state) {
        stateCalc++
        return state.name + state.todos.map(transformTodo).join(",")
    })

    var transformTodo = m.createTransformer(
        function(todo) {
            todoCalc++
            return todo.title.toUpperCase()
        },
        function cleanup(text, todo) {
            unloaded.push([todo, text])
        }
    )

    m.autorun(function() {
        mapped = transformState(state)
    })

    expect(mapped).toBe("michelCOFFEE")
    expect(stateCalc).toBe(1)
    expect(todoCalc).toBe(1)

    state.name = "john"
    expect(mapped).toBe("johnCOFFEE")
    expect(stateCalc).toBe(2)
    expect(todoCalc).toBe(1)

    state.todos[0].title = "TEA"
    expect(mapped).toBe("johnTEA")
    expect(stateCalc).toBe(3)
    expect(todoCalc).toBe(2)

    state.todos.push({ title: "BISCUIT" })
    expect(mapped).toBe("johnTEA,BISCUIT")
    expect(stateCalc).toBe(4)
    expect(todoCalc).toBe(3)

    var tea = state.todos.shift()
    expect(mapped).toBe("johnBISCUIT")
    expect(stateCalc).toBe(5)
    expect(todoCalc).toBe(3)

    expect(unloaded.length).toBe(1)
    expect(unloaded[0][0]).toBe(tea)
    expect(unloaded[0][1]).toBe("TEA")
    expect(tea.$mobx.values.title.observers.length).toBe(0)
    expect(state.todos[0].$mobx.values.title.observers.length).toBe(1)

    tea.title = "mint"
    expect(mapped).toBe("johnBISCUIT")
    expect(stateCalc).toBe(5)
    expect(todoCalc).toBe(3)

    expect(Object.keys(state.todos[0])).toEqual(["title"])
})

test("createTransformer as off-instance computed", () => {
    var runs = 0

    // observable in closure
    var capitalize = m.observable(false)

    var _computeDisplayName = person => {
        runs++ // count the runs
        var res = person.firstName + " " + person.lastName
        if (capitalize.get()) return res.toUpperCase()
        return res
    }

    // transformer creates a computed but reuses it for every time the same object is passed in
    var displayName = m.createTransformer(_computeDisplayName)

    var person1 = m.observable({
        firstName: "Mickey",
        lastName: "Mouse"
    })

    var person2 = m.observable({
        firstName: "Donald",
        lastName: "Duck"
    })

    var persons = m.observable([])
    var displayNames = []

    var disposer = m.autorun(() => {
        displayNames = persons.map(p => displayName(p))
    })

    expect(runs).toBe(0)
    expect(displayNames).toEqual([])

    persons.push(person1)
    expect(runs).toBe(1)
    expect(displayNames).toEqual(["Mickey Mouse"])

    expect(displayName(person1)).toBe("Mickey Mouse")
    expect(runs).toBe(1)

    persons.push(person2)
    expect(runs).toBe(2)
    expect(displayNames).toEqual(["Mickey Mouse", "Donald Duck"])

    persons.push(person1)
    expect(runs).toBe(2)
    expect(displayNames).toEqual(["Mickey Mouse", "Donald Duck", "Mickey Mouse"])

    person1.firstName = "Minnie"
    expect(runs).toBe(3)
    expect(displayNames).toEqual(["Minnie Mouse", "Donald Duck", "Minnie Mouse"])

    capitalize.set(true)
    expect(runs).toBe(5)
    expect(displayNames).toEqual(["MINNIE MOUSE", "DONALD DUCK", "MINNIE MOUSE"])

    persons.splice(1, 1)
    expect(displayNames).toEqual(["MINNIE MOUSE", "MINNIE MOUSE"])

    person2.firstName = "Dagobert"
    expect(runs).toBe(5)

    disposer()
    person1.lastName = "Maxi"
    expect(runs).toBe(5)

    expect(displayName(person1)).toBe("MINNIE MAXI")
    expect(runs).toBe(6)
})

test("163 - resetGlobalState should clear cache", function() {
    var runs = 0
    function doubler(x) {
        runs++
        return { value: x.value * 2 }
    }

    var doubleTransformer = m.createTransformer(doubler)
    var a = { value: 2 }

    var autorunTrigger = m.observable(1)
    var transformOutputs = []

    m.autorun(function() {
        autorunTrigger.get()
        transformOutputs.push(doubleTransformer(a))
    })
    expect(runs).toBe(1)

    autorunTrigger.set(2)
    expect(runs).toBe(1)
    expect(transformOutputs.length).toBe(2)
    expect(transformOutputs[1]).toBe(transformOutputs[0])

    m.extras.resetGlobalState()

    autorunTrigger.set(3)
    expect(runs).toBe(2)
    expect(transformOutputs.length).toBe(3)
    expect(transformOutputs[2]).not.toBe(transformOutputs[1])
})

test("transform into reactive graph", function() {
    function Folder(name) {
        m.extendObservable(this, {
            name: name,
            children: []
        })
    }

    var _childrenRecalc = 0
    function DerivedFolder(state, baseFolder) {
        this.state = state
        this.baseFolder = baseFolder
        m.extendObservable(this, {
            get name() {
                return this.baseFolder.name
            },
            get isVisible() {
                return (
                    !this.state.filter ||
                    this.name.indexOf(this.state.filter) !== -1 ||
                    this.children.length > 0
                )
            },
            get children() {
                _childrenRecalc++
                return this.baseFolder.children.map(transformFolder).filter(function(folder) {
                    return folder.isVisible === true
                })
            }
        })
    }

    var state = m.observable({
        filter: null
    })

    var _transformCount = 0
    var transformFolder = m.createTransformer(function(folder) {
        _transformCount++
        console.log("Transform", folder.name)
        return new DerivedFolder(state, folder)
    })

    state.root = new Folder("/")
    m.autorun(function() {
        state.derived = transformFolder(state.root)
        state.derived.children
    })

    /** test convience */
    function childrenRecalcs() {
        var a = _childrenRecalc
        _childrenRecalc = 0
        return a
    }

    function transformCount() {
        var a = _transformCount
        _transformCount = 0
        return a
    }

    expect(state.derived.name).toBe("/")
    expect(state.derived.children.length).toBe(0)
    expect(transformCount()).toBe(1)
    expect(childrenRecalcs()).toBe(1)

    state.root.children.push(new Folder("hoi"))
    expect(state.derived.name).toBe("/")
    expect(state.derived.children.length).toBe(1)
    expect(state.derived.children[0].name).toBe("hoi")
    expect(transformCount()).toBe(1)
    expect(childrenRecalcs()).toBe(1)

    state.filter = "boe"
    expect(state.derived.name).toBe("/")
    expect(state.derived.isVisible).toBe(false)
    expect(state.derived.children.length).toBe(0)
    expect(transformCount()).toBe(0)
    expect(childrenRecalcs()).toBe(2)

    state.filter = "oi"
    expect(state.derived.name).toBe("/")
    expect(state.derived.isVisible).toBe(true)
    expect(state.derived.children.length).toBe(1)
    expect(state.derived.children[0].name).toBe("hoi")
    expect(transformCount()).toBe(0)
    expect(childrenRecalcs()).toBe(1)
})

// testing: https://github.com/mobxjs/mobx/issues/67
test("transform tree (modifying tree incrementally)", function() {
    var pluckFn = TransformUtils.pluckFn
    var identity = TransformUtils.identity
    var testSet = TransformUtils.testSet()
    var state = testSet.state
    var stats = testSet.stats
    var TreeNode = testSet.TreeNode
    var DisplayNode = testSet.DisplayNode

    var nodeCreateCount = 0
    var renderCount = 0
    var renderNodeCount = 0

    var transformNode = m.createTransformer(
        function(node) {
            nodeCreateCount++
            return new DisplayNode(node)
        },
        function cleanup(displayNode, node) {
            displayNode.destroy()
        }
    )

    // transform nodes to renderedNodes
    m.autorun(function() {
        // KM: ideally, I would like to do an assignment here, but it creates a cycle and would need to preserve ms.modifiers.structure:
        //
        // state.renderedNodes = state.root ? state.root.map(transformNode) : [];
        //

        var renderedNodes = state.root ? state.root.map(transformNode) : []
        state.renderedNodes.replace(renderedNodes)
    })

    // render
    m.autorun(function() {
        renderCount++
        renderNodeCount += state.renderedNodes.length
    })

    expect(nodeCreateCount).toBe(0)
    expect(stats.refCount).toBe(0)
    expect(renderCount).toBe(1)
    expect(renderNodeCount).toBe(0)
    expect(state.renderedNodes.length).toEqual(0)

    ////////////////////////////////////
    // Incremental Tree
    ////////////////////////////////////

    // initialize root
    var node = new TreeNode("root")
    state.root = node
    expect(nodeCreateCount).toBe(1)
    expect(stats.refCount).toBe(1)
    expect(renderCount).toBe(2)
    expect(renderNodeCount).toBe(1)
    expect(state.renderedNodes.length).toEqual(1)
    expect(state.renderedNodes.map(pluckFn("node"))).toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual(["root"])

    // add first child
    state.root.addChild(new TreeNode("root-child-1"))
    expect(nodeCreateCount).toBe(1 + 1)
    expect(stats.refCount).toBe(1 + 1)
    expect(renderCount).toBe(2 + 1)
    expect(renderNodeCount).toBe(1 + 2)
    expect(state.renderedNodes.length).toEqual(2)
    expect(state.renderedNodes.map(pluckFn("node"))).toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual(["root", "root-child-1"])

    // add second child
    state.root.addChild(new TreeNode("root-child-2"))
    expect(nodeCreateCount).toBe(1 + 1 + 1)
    expect(stats.refCount).toBe(1 + 1 + 1)
    expect(renderCount).toBe(2 + 1 + 1)
    expect(renderNodeCount).toBe(1 + 2 + 3)
    expect(state.renderedNodes.length).toEqual(3)
    expect(state.renderedNodes.map(pluckFn("node"))).toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual([
        "root",
        "root-child-1",
        "root-child-2"
    ])

    // add first child to second child
    node = state.root.find(function(node) {
        return node.name === "root-child-2"
    })
    node.addChild(new TreeNode("root-child-2-child-1"))
    expect(nodeCreateCount).toBe(1 + 1 + 1 + 1)
    expect(stats.refCount).toBe(1 + 1 + 1 + 1)
    expect(renderCount).toBe(2 + 1 + 1 + 1)
    expect(renderNodeCount).toBe(1 + 2 + 3 + 4)
    expect(state.renderedNodes.length).toEqual(4)
    expect(state.renderedNodes.map(pluckFn("node"))).toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual([
        "root",
        "root-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    // add first child to first child
    node = state.root.find(function(node) {
        return node.name === "root-child-1"
    })
    node.addChild(new TreeNode("root-child-1-child-1"))
    expect(nodeCreateCount).toBe(1 + 1 + 1 + 1 + 1)
    expect(stats.refCount).toBe(1 + 1 + 1 + 1 + 1)
    expect(renderCount).toBe(2 + 1 + 1 + 1 + 1)
    expect(renderNodeCount).toBe(1 + 2 + 3 + 4 + 5)
    expect(state.renderedNodes.length).toEqual(5)
    expect(state.renderedNodes.map(pluckFn("node"))).toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual([
        "root",
        "root-child-1",
        "root-child-1-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    // remove children from first child
    node = state.root.find(function(node) {
        return node.name === "root-child-1"
    })
    node.children.splice(0)
    expect(nodeCreateCount).toBe(1 + 1 + 1 + 1 + 1 + 0)
    expect(stats.refCount).toBe(1 + 1 + 1 + 1 + 1 - 1)
    expect(renderCount).toBe(2 + 1 + 1 + 1 + 1 + 1)
    expect(renderNodeCount).toBe(1 + 2 + 3 + 4 + 5 + 4)
    expect(state.renderedNodes.length).toEqual(4)
    expect(state.renderedNodes.map(pluckFn("node"))).toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual([
        "root",
        "root-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    // remove children from first child with no children should be a no-op
    node = state.root.find(function(node) {
        return node.name === "root-child-1"
    })
    node.children.splice(0)
    expect(nodeCreateCount).toBe(1 + 1 + 1 + 1 + 1 + 0 + 0)
    expect(stats.refCount).toBe(1 + 1 + 1 + 1 + 1 - 1 + 0)
    expect(renderCount).toBe(2 + 1 + 1 + 1 + 1 + 1 + 0)
    expect(renderNodeCount).toBe(1 + 2 + 3 + 4 + 5 + 4 + 0)
    expect(state.renderedNodes.length).toEqual(4)
    expect(state.renderedNodes.map(pluckFn("node"))).toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual([
        "root",
        "root-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    // remove children from root
    state.root.children.splice(0)
    expect(nodeCreateCount).toBe(1 + 1 + 1 + 1 + 1 + 0 + 0 + 0)
    expect(stats.refCount).toBe(1 + 1 + 1 + 1 + 1 - 1 + 0 - 3)
    expect(renderCount).toBe(2 + 1 + 1 + 1 + 1 + 1 + 0 + 1)
    expect(renderNodeCount).toBe(1 + 2 + 3 + 4 + 5 + 4 + 0 + 1)
    expect(state.renderedNodes.length).toEqual(1)
    expect(state.renderedNodes.map(pluckFn("node"))).toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual(["root"])

    // teardown
    state.root = null
    expect(nodeCreateCount).toBe(1 + 1 + 1 + 1 + 1 + 0 + 0 + 0 + 0)
    expect(stats.refCount).toBe(0)
    expect(renderCount).toBe(2 + 1 + 1 + 1 + 1 + 1 + 0 + 1 + 1)
    expect(renderNodeCount).toBe(1 + 2 + 3 + 4 + 5 + 4 + 0 + 1 + 0)
    expect(state.renderedNodes.length).toEqual(0)
})

test("transform tree (modifying tree incrementally)", function() {
    var pluckFn = TransformUtils.pluckFn
    var identity = TransformUtils.identity
    var testSet = TransformUtils.testSet()
    var state = testSet.state
    var stats = testSet.stats
    var TreeNode = testSet.TreeNode
    var DisplayNode = testSet.DisplayNode

    var nodeCreateCount = 0
    var renderCount = 0
    var renderNodeCount = 0

    var transformNode = m.createTransformer(
        function(node) {
            nodeCreateCount++
            return new DisplayNode(node)
        },
        function cleanup(displayNode, node) {
            displayNode.destroy()
        }
    )

    // transform nodes to renderedNodes
    m.autorun(function() {
        var renderedNodes = state.root ? state.root.map(transformNode) : []
        state.renderedNodes.replace(renderedNodes)
    })

    // render
    m.autorun(function() {
        renderCount++
        renderNodeCount += state.renderedNodes.length
    })

    // setup
    var node = new TreeNode("root-1")
    state.root = node
    expect(nodeCreateCount).toBe(1)
    expect(stats.refCount).toBe(1)
    expect(renderCount).toBe(2)
    expect(renderNodeCount).toBe(1)
    expect(state.renderedNodes.length).toEqual(1)
    expect(state.renderedNodes.map(pluckFn("node"))).toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual(["root-1"])

    ////////////////////////////////////
    // Batch Tree (Partial)
    ////////////////////////////////////

    // add partial tree as a batch
    var children = []
    children.push(new TreeNode("root-1-child-1b"))
    children[0].addChild(new TreeNode("root-1-child-1b-child-1"))
    children.push(new TreeNode("root-1-child-2b"))
    children[1].addChild(new TreeNode("root-1-child-2b-child-1"))
    state.root.addChildren(children)
    expect(nodeCreateCount).toBe(1 + 4)
    expect(stats.refCount).toBe(1 + 4)
    expect(renderCount).toBe(2 + 1)
    expect(renderNodeCount).toBe(1 + 5)
    expect(state.renderedNodes.length).toEqual(5)
    expect(state.renderedNodes.map(pluckFn("node"))).toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual([
        "root-1",
        "root-1-child-1b",
        "root-1-child-1b-child-1",
        "root-1-child-2b",
        "root-1-child-2b-child-1"
    ])

    // remove root-1
    state.root = null
    expect(nodeCreateCount).toBe(1 + 4 + 0)
    expect(stats.refCount).toBe(1 + 4 - 5)
    expect(renderCount).toBe(2 + 1 + 1)
    expect(renderNodeCount).toBe(1 + 5 + 0)
    expect(state.renderedNodes.length).toEqual(0)

    ////////////////////////////////////
    // Batch Tree (Full)
    ////////////////////////////////////

    // add full tree as a batch
    node = new TreeNode("root-2")
    node.addChild(new TreeNode("root-2-child-1"))
    node.children[0].addChild(new TreeNode("root-2-child-1-child-1"))
    node.addChild(new TreeNode("root-2-child-2"))
    node.children[1].addChild(new TreeNode("root-2-child-2-child-1"))
    state.root = node
    expect(nodeCreateCount).toBe(1 + 4 + 0 + 5)
    expect(stats.refCount).toBe(1 + 4 - 5 + 5)
    expect(renderCount).toBe(2 + 1 + 1 + 1)
    expect(renderNodeCount).toBe(1 + 5 + 0 + 5)
    expect(state.renderedNodes.length).toEqual(5)
    expect(state.renderedNodes.map(pluckFn("node"))).toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual([
        "root-2",
        "root-2-child-1",
        "root-2-child-1-child-1",
        "root-2-child-2",
        "root-2-child-2-child-1"
    ])

    // teardown
    state.root = null
    expect(nodeCreateCount).toBe(1 + 4 + 0 + 5 + 0)
    expect(stats.refCount).toBe(0)
    expect(renderCount).toBe(2 + 1 + 1 + 1 + 1)
    expect(renderNodeCount).toBe(1 + 5 + 0 + 5 + 0)
    expect(state.renderedNodes.length).toEqual(0)
})

test("transform tree (modifying expanded)", function() {
    var pluckFn = TransformUtils.pluckFn
    var identity = TransformUtils.identity
    var testSet = TransformUtils.testSet()
    var state = testSet.state
    var stats = testSet.stats
    var TreeNode = testSet.TreeNode
    var DisplayNode = testSet.DisplayNode

    var nodeCreateCount = 0
    var renderCount = 0
    var renderNodeCount = 0

    var transformNode = m.createTransformer(
        function(node) {
            nodeCreateCount++
            return new DisplayNode(node)
        },
        function cleanup(displayNode, node) {
            displayNode.destroy()
        }
    )

    // transform nodes to renderedNodes
    m.autorun(function() {
        var renderedNodes = state.root ? state.root.transform(transformNode) : []
        state.renderedNodes.replace(renderedNodes)
    })

    // render
    m.autorun(function() {
        renderCount++
        renderNodeCount += state.renderedNodes.length
    })

    // patch for collapsed
    TreeNode.prototype.transform = function(iteratee, results) {
        if (this.parent && state.collapsed.has(this.parent.path())) return results || [] // not visible

        results = results || []
        results.push(iteratee(this))
        this.children.forEach(function(child) {
            child.transform(iteratee, results)
        })
        return results
    }

    // setup
    var node = new TreeNode("root")
    node.addChild(new TreeNode("root-child-1"))
    node.children[0].addChild(new TreeNode("root-child-1-child-1"))
    node.addChild(new TreeNode("root-child-2"))
    node.children[1].addChild(new TreeNode("root-child-2-child-1"))
    state.root = node
    expect(nodeCreateCount).toBe(5)
    expect(stats.refCount).toBe(5)
    expect(renderCount).toBe(2)
    expect(renderNodeCount).toBe(5)
    expect(state.renderedNodes.length).toEqual(5)
    expect(state.renderedNodes.map(pluckFn("node"))).toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual([
        "root",
        "root-child-1",
        "root-child-1-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    ////////////////////////////////////
    // Expanded
    ////////////////////////////////////

    // toggle root to collapsed
    state.renderedNodes[0].toggleCollapsed()
    expect(nodeCreateCount).toBe(5 + 0)
    expect(stats.refCount).toBe(5 - 4)
    expect(renderCount).toBe(2 + 1)
    expect(renderNodeCount).toBe(5 + 1)
    expect(state.renderedNodes.length).toEqual(1)
    expect(state.renderedNodes.map(pluckFn("node"))).not.toEqual(state.root.map(identity)) // not a direct map of the tree nodes
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual(["root"])

    // toggle root to expanded
    state.renderedNodes[0].toggleCollapsed()
    expect(nodeCreateCount).toBe(5 + 0 + 4)
    expect(stats.refCount).toBe(5 - 4 + 4)
    expect(renderCount).toBe(2 + 1 + 1)
    expect(renderNodeCount).toBe(5 + 1 + 5)
    expect(state.renderedNodes.length).toEqual(5)
    expect(state.renderedNodes.map(pluckFn("node"))).toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual([
        "root",
        "root-child-1",
        "root-child-1-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    // toggle child-1 collapsed
    state.renderedNodes[1].toggleCollapsed()
    expect(nodeCreateCount).toBe(5 + 0 + 4 + 0)
    expect(stats.refCount).toBe(5 - 4 + 4 - 1)
    expect(renderCount).toBe(2 + 1 + 1 + 1)
    expect(renderNodeCount).toBe(5 + 1 + 5 + 4)
    expect(state.renderedNodes.length).toEqual(4)
    expect(state.renderedNodes.map(pluckFn("node"))).not.toEqual(state.root.map(identity)) // not a direct map of the tree nodes
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual([
        "root",
        "root-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    // toggle child-2-child-1 collapsed should be a no-op
    state.renderedNodes[state.renderedNodes.length - 1].toggleCollapsed()
    expect(nodeCreateCount).toBe(5 + 0 + 4 + 0 + 0)
    expect(stats.refCount).toBe(5 - 4 + 4 - 1 + 0)
    expect(renderCount).toBe(2 + 1 + 1 + 1 + 0)
    expect(renderNodeCount).toBe(5 + 1 + 5 + 4 + 0)
    expect(state.renderedNodes.length).toEqual(4)
    expect(state.renderedNodes.map(pluckFn("node"))).not.toEqual(state.root.map(identity)) // not a direct map of the tree nodes
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual([
        "root",
        "root-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    // teardown
    state.root = null
    expect(nodeCreateCount).toBe(5 + 0 + 4 + 0 + 0 + 0)
    expect(stats.refCount).toBe(0)
    expect(renderCount).toBe(2 + 1 + 1 + 1 + 0 + 1)
    expect(renderNodeCount).toBe(5 + 1 + 5 + 4 + 0 + 0)
    expect(state.renderedNodes.length).toEqual(0)
})

test("transform tree (modifying render observable)", function() {
    var pluckFn = TransformUtils.pluckFn
    var identity = TransformUtils.identity
    var testSet = TransformUtils.testSet()
    var state = testSet.state
    var stats = testSet.stats
    var TreeNode = testSet.TreeNode
    var DisplayNode = testSet.DisplayNode

    var nodeCreateCount = 0
    var renderCount = 0
    var renderNodeCount = 0
    var renderIconCalc = 0

    var transformNode = m.createTransformer(
        function(node) {
            nodeCreateCount++
            return new DisplayNode(node)
        },
        function cleanup(displayNode, node) {
            displayNode.destroy()
        }
    )

    // transform nodes to renderedNodes
    m.autorun(function() {
        var renderedNodes = state.root ? state.root.transform(transformNode) : []
        state.renderedNodes.replace(renderedNodes)
    })

    // render
    m.autorun(function() {
        renderCount++
        renderNodeCount += state.renderedNodes.length
    })

    // custom transform
    TreeNode.prototype.transform = function(iteratee, results) {
        node.icon.get() // icon dependency

        results = results || []
        results.push(iteratee(this))
        this.children.forEach(function(child) {
            child.transform(iteratee, results)
        })
        return results
    }

    // setup
    var node = new TreeNode("root")
    node.addChild(new TreeNode("root-child-1"))
    node.children[0].addChild(new TreeNode("root-child-1-child-1"))
    node.addChild(new TreeNode("root-child-2"))
    node.children[1].addChild(new TreeNode("root-child-2-child-1"))
    state.root = node
    expect(nodeCreateCount).toBe(5)
    expect(stats.refCount).toBe(5)
    expect(renderCount).toBe(2)
    expect(renderNodeCount).toBe(5)
    expect(state.renderedNodes.length).toEqual(5)
    expect(state.renderedNodes.map(pluckFn("node"))).toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual([
        "root",
        "root-child-1",
        "root-child-1-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    ////////////////////////////////////
    // Icon
    ////////////////////////////////////

    // update root icon
    state.root.icon.set("file")
    expect(nodeCreateCount).toBe(5 + 0)
    expect(stats.refCount).toBe(5 + 0)
    expect(renderCount).toBe(2 + 1)
    expect(renderNodeCount).toBe(5 + 5)
    expect(state.renderedNodes.length).toEqual(5)
    expect(state.renderedNodes.map(pluckFn("node"))).toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual([
        "root",
        "root-child-1",
        "root-child-1-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    // teardown
    state.root = null
    expect(nodeCreateCount).toBe(5 + 0 + 0)
    expect(stats.refCount).toBe(0)
    expect(renderCount).toBe(2 + 1 + 1)
    expect(renderNodeCount).toBe(5 + 5 + 0)
    expect(state.renderedNodes.length).toEqual(0)
})

test("transform tree (modifying render-only observable)", function() {
    var pluckFn = TransformUtils.pluckFn
    var identity = TransformUtils.identity
    var testSet = TransformUtils.testSet()
    var state = testSet.state
    var stats = testSet.stats
    var TreeNode = testSet.TreeNode
    var DisplayNode = testSet.DisplayNode

    var nodeCreateCount = 0
    var renderCount = 0
    var renderNodeCount = 0
    var renderIconCalc = 0

    var transformNode = m.createTransformer(
        function(node) {
            nodeCreateCount++
            return new DisplayNode(node)
        },
        function cleanup(displayNode, node) {
            displayNode.destroy()
        }
    )

    // transform nodes to renderedNodes
    m.autorun(function() {
        var renderedNodes = state.root ? state.root.map(transformNode) : []
        state.renderedNodes.replace(renderedNodes)
    })

    // render
    m.autorun(function() {
        renderCount++
        renderNodeCount += state.renderedNodes.length

        state.renderedNodes.forEach(function(renderedNode) {
            m.autorun(function() {
                renderIconCalc++
                renderedNode.node.icon.get() // icon dependency
            })
        })
    })

    // setup
    var node = new TreeNode("root")
    node.addChild(new TreeNode("root-child-1"))
    node.children[0].addChild(new TreeNode("root-child-1-child-1"))
    node.addChild(new TreeNode("root-child-2"))
    node.children[1].addChild(new TreeNode("root-child-2-child-1"))
    state.root = node
    expect(nodeCreateCount).toBe(5)
    expect(stats.refCount).toBe(5)
    expect(renderCount).toBe(2)
    expect(renderNodeCount).toBe(5)
    expect(renderIconCalc).toBe(5)
    expect(state.renderedNodes.length).toEqual(5)
    expect(state.renderedNodes.map(pluckFn("node"))).toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual([
        "root",
        "root-child-1",
        "root-child-1-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    ////////////////////////////////////
    // Icon
    ////////////////////////////////////

    // update root icon
    state.root.icon.set("file")
    expect(nodeCreateCount).toBe(5 + 0)
    expect(stats.refCount).toBe(5 + 0)
    expect(renderCount).toBe(2 + 0)
    expect(renderNodeCount).toBe(5 + 0)
    expect(renderIconCalc).toBe(5 + 1)
    expect(state.renderedNodes.length).toEqual(5)
    expect(state.renderedNodes.map(pluckFn("node"))).toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual([
        "root",
        "root-child-1",
        "root-child-1-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    // teardown
    state.root = null
    expect(nodeCreateCount).toBe(5 + 0 + 0)
    expect(stats.refCount).toBe(0)
    expect(renderCount).toBe(2 + 0 + 1)
    expect(renderNodeCount).toBe(5 + 0 + 0)
    expect(renderIconCalc).toBe(5 + 1 + 0)
    expect(state.renderedNodes.length).toEqual(0)
})

test("transform tree (static tags / global filter only)", function() {
    var intersection = TransformUtils.intersection
    var pluckFn = TransformUtils.pluckFn
    var identity = TransformUtils.identity
    var testSet = TransformUtils.testSet()
    var state = testSet.state
    var stats = testSet.stats
    var TreeNode = testSet.TreeNode
    var DisplayNode = testSet.DisplayNode

    var nodeCreateCount = 0
    var renderCount = 0
    var renderNodeCount = 0

    var transformNode = m.createTransformer(
        function(node) {
            nodeCreateCount++
            return new DisplayNode(node)
        },
        function cleanup(displayNode, node) {
            displayNode.destroy()
        }
    )

    // transform nodes to renderedNodes
    m.autorun(function() {
        var renderedNodes = state.root ? state.root.transform(transformNode) : []
        state.renderedNodes.replace(renderedNodes)
    })

    // render
    m.autorun(function() {
        renderCount++
        renderNodeCount += state.renderedNodes.length
    })

    // no tags
    state.tags = m.observable.array([])

    // custom transform
    TreeNode.prototype.transform = function(iteratee, results) {
        results = results || []
        if (!state.tags.length || intersection(state.tags, this.tags).length)
            results.push(iteratee(this))
        this.children.forEach(function(child) {
            child.transform(iteratee, results)
        })
        return results
    }

    // setup
    var node = new TreeNode("root", { tags: [1] })
    node.addChild(new TreeNode("root-child-1", { tags: [2] }))
    node.children[0].addChild(new TreeNode("root-child-1-child-1", { tags: [3] }))
    node.addChild(new TreeNode("root-child-2", { tags: [2] }))
    node.children[1].addChild(new TreeNode("root-child-2-child-1", { tags: [3] }))
    state.root = node
    expect(nodeCreateCount).toBe(5)
    expect(stats.refCount).toBe(5)
    expect(renderCount).toBe(2)
    expect(renderNodeCount).toBe(5)
    expect(state.renderedNodes.length).toEqual(5)
    expect(state.renderedNodes.map(pluckFn("node"))).toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual([
        "root",
        "root-child-1",
        "root-child-1-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    ////////////////////////////////////
    // Tags
    ////////////////////////////////////

    // add search tag
    state.tags.push(2)
    expect(nodeCreateCount).toBe(5 + 0)
    expect(stats.refCount).toBe(5 - 3)
    expect(renderCount).toBe(2 + 1)
    expect(renderNodeCount).toBe(5 + 2)
    expect(state.renderedNodes.length).toEqual(2)
    expect(state.renderedNodes.map(pluckFn("node"))).not.toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual(["root-child-1", "root-child-2"])

    // add search tag
    state.tags.push(3)
    expect(nodeCreateCount).toBe(5 + 0 + 2)
    expect(stats.refCount).toBe(5 - 3 + 2)
    expect(renderCount).toBe(2 + 1 + 1)
    expect(renderNodeCount).toBe(5 + 2 + 4)
    expect(state.renderedNodes.length).toEqual(4)
    expect(state.renderedNodes.map(pluckFn("node"))).not.toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual([
        "root-child-1",
        "root-child-1-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    // add search tag
    state.tags.push(1)
    expect(nodeCreateCount).toBe(5 + 0 + 2 + 1)
    expect(stats.refCount).toBe(5 - 3 + 2 + 1)
    expect(renderCount).toBe(2 + 1 + 1 + 1)
    expect(renderNodeCount).toBe(5 + 2 + 4 + 5)
    expect(state.renderedNodes.length).toEqual(5)
    expect(state.renderedNodes.map(pluckFn("node"))).toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual([
        "root",
        "root-child-1",
        "root-child-1-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    // remove search tags
    state.tags.splice(0, 2)
    expect(nodeCreateCount).toBe(5 + 0 + 2 + 1 + 0)
    expect(stats.refCount).toBe(5 - 3 + 2 + 1 - 4)
    expect(renderCount).toBe(2 + 1 + 1 + 1 + 1)
    expect(renderNodeCount).toBe(5 + 2 + 4 + 5 + 1)
    expect(state.renderedNodes.length).toEqual(1)
    expect(state.renderedNodes.map(pluckFn("node"))).not.toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual(["root"])

    // teardown
    state.root = null
    expect(nodeCreateCount).toBe(5 + 0 + 2 + 1 + 0 + 0)
    expect(stats.refCount).toBe(0)
    expect(renderCount).toBe(2 + 1 + 1 + 1 + 1 + 1)
    expect(renderNodeCount).toBe(5 + 2 + 4 + 5 + 1 + 0)
    expect(state.renderedNodes.length).toEqual(0)
})

test("transform tree (dynamic tags - peek / rebuild)", function() {
    var intersection = TransformUtils.intersection
    var pluckFn = TransformUtils.pluckFn
    var identity = TransformUtils.identity
    var testSet = TransformUtils.testSet()
    var state = testSet.state
    var stats = testSet.stats
    var TreeNode = testSet.TreeNode
    var DisplayNode = testSet.DisplayNode

    var nodeCreateCount = 0
    var renderCount = 0
    var renderNodeCount = 0

    var transformNode = m.createTransformer(
        function(node) {
            nodeCreateCount++
            return new DisplayNode(node)
        },
        function cleanup(displayNode, node) {
            displayNode.destroy()
        }
    )

    // transform nodes to renderedNodes
    m.autorun(function() {
        var renderedNodes = state.root ? state.root.transform(transformNode) : []
        state.renderedNodes.replace(renderedNodes)
    })

    // render
    m.autorun(function() {
        renderCount++
        renderNodeCount += state.renderedNodes.length
    })

    // no tags
    state.tags = m.observable.array([])

    // custom transform
    TreeNode.prototype.transform = function(iteratee, results) {
        results = results || []
        if (!state.tags.length || intersection(state.tags, this.tags).length)
            results.push(iteratee(this))
        this.children.forEach(function(child) {
            child.transform(iteratee, results)
        })
        return results
    }

    // setup
    var node = new TreeNode("root", { tags: m.observable.array([1]) })
    node.addChild(new TreeNode("root-child-1", { tags: m.observable.array([2]) }))
    node.children[0].addChild(
        new TreeNode("root-child-1-child-1", { tags: m.observable.array([3]) })
    )
    node.addChild(new TreeNode("root-child-2", { tags: m.observable.array([2]) }))
    node.children[1].addChild(
        new TreeNode("root-child-2-child-1", { tags: m.observable.array([3]) })
    )
    state.root = node
    expect(nodeCreateCount).toBe(5)
    expect(stats.refCount).toBe(5)
    expect(renderCount).toBe(2)
    expect(renderNodeCount).toBe(5)
    expect(state.renderedNodes.length).toEqual(5)
    expect(state.renderedNodes.map(pluckFn("node"))).toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual([
        "root",
        "root-child-1",
        "root-child-1-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    ////////////////////////////////////
    // Tags
    ////////////////////////////////////

    // add search tag
    state.tags.push(2)
    expect(nodeCreateCount).toBe(5 + 0)
    expect(stats.refCount).toBe(5 - 3)
    expect(renderCount).toBe(2 + 1)
    expect(renderNodeCount).toBe(5 + 2)
    expect(state.renderedNodes.length).toEqual(2)
    expect(state.renderedNodes.map(pluckFn("node"))).not.toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual(["root-child-1", "root-child-2"])

    // modify search tag
    state.root.tags.push(2)
    expect(nodeCreateCount).toBe(5 + 0 + 1)
    expect(stats.refCount).toBe(5 - 3 + 1)
    expect(renderCount).toBe(2 + 1 + 1)
    expect(renderNodeCount).toBe(5 + 2 + 3)
    expect(state.renderedNodes.length).toEqual(3)
    expect(state.renderedNodes.map(pluckFn("node"))).not.toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual([
        "root",
        "root-child-1",
        "root-child-2"
    ])

    // perform multiple search tag operations
    m.transaction(function() {
        state.root.tags.shift() // no-op
        state.root
            .find(function(node) {
                return node.name === "root-child-1"
            })
            .tags.splice(0)
        state.root
            .find(function(node) {
                return node.name === "root-child-1-child-1"
            })
            .tags.push(2)
        state.root
            .find(function(node) {
                return node.name === "root-child-2-child-1"
            })
            .tags.push(2)
    })
    expect(nodeCreateCount).toBe(5 + 0 + 1 + 2)
    expect(stats.refCount).toBe(5 - 3 + 1 + 1)
    expect(renderCount).toBe(2 + 1 + 1 + 1)
    expect(renderNodeCount).toBe(5 + 2 + 3 + 4)
    expect(state.renderedNodes.length).toEqual(4)
    expect(state.renderedNodes.map(pluckFn("node"))).not.toEqual(state.root.map(identity))
    expect(state.renderedNodes.map(pluckFn("node.name"))).toEqual([
        "root",
        "root-child-1-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    // teardown
    state.root = null
    expect(nodeCreateCount).toBe(5 + 0 + 1 + 2 + 0)
    expect(stats.refCount).toBe(0)
    expect(renderCount).toBe(2 + 1 + 1 + 1 + 1)
    expect(renderNodeCount).toBe(5 + 2 + 3 + 4 + 0)
    expect(state.renderedNodes.length).toEqual(0)
})

// https://github.com/mobxjs/mobx/issues/886
test("transform with primitive key", function() {
    m.extras.resetGlobalState()

    function Bob() {
        this.num = Math.floor(Math.random() * 1000)
        m.extendObservable(this, {
            get name() {
                return "Bob" + this.num
            }
        })
    }

    var observableBobs = m.observable([])
    var bobs = []

    var bobFactory = m.createTransformer(function(key) {
        return new Bob()
    })

    m.autorun(function() {
        bobs = observableBobs.map(function(bob) {
            return bobFactory(bob)
        })
    })

    observableBobs.push("Bob1")
    observableBobs.push("Bob1")
    expect(bobs[0].name).toBe(bobs[1].name)

    observableBobs.clear()
    observableBobs.push("Bob1")
    observableBobs.push("Bob2")
    expect(bobs[0].name).not.toBe(bobs[1].name)

    observableBobs.clear()
    observableBobs.push(1)
    observableBobs.push(1)
    expect(bobs[0].name).toBe(bobs[1].name)

    observableBobs.clear()
    observableBobs.push(1)
    observableBobs.push(2)
    expect(bobs[0].name).not.toBe(bobs[1].name)
})
