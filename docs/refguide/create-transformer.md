---
title: createTransformer
sidebar_label: mobxUtils.createTransformer
hide_title: true
---

# createTransformer

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

Provided by the `mobx-utils` package.

`createTransformer<A, B>(transformation: (value: A) => B, onCleanup?: (result: B, value?: A) => void): (value: A) => B`

`createTransformer` turns a function (that should transform value `A` into another value `B`) into a reactive and memoizing function.
In other words, if the `transformation` function computes B given a specific A, the same B will be returned for all other future invocations of the transformation with the same A.
However, if A changes, the transformation will be re-applied so that B is updated accordingly.
And last but not least, if nobody is using the transformation of a specific A anymore, its entry will be removed from the memoization table.

With `createTransformer` it is very easy to transform a complete data graph into another data graph.
Transformation functions can be composed so that you can build a tree using lots of small transformations.
The resulting data graph will never be stale, it will be kept in sync with the source by applying small patches to the result graph.
This makes it very easy to achieve powerful patterns similar to sideways data loading, map-reduce, tracking state history using immutable data structures etc.

The optional `onCleanup` function can be used to get a notification when a transformation of an object is no longer needed.
This can be used to dispose resources attached to the result object if needed.

Always use transformations inside a reaction like `@observer` or `autorun`.
Transformations will, like any other computed value, fall back to lazy evaluation if not observed by something, which sort of defeats their purpose.

This all might still be a bit vague, so here are two examples that explain this whole idea of transforming one data structure into another by using small, reactive functions:

## Tracking mutable state using immutable, shared data structures.

This example is taken from the [Reactive2015 conference demo](https://github.com/mobxjs/mobx-reactive2015-demo):

```javascript
/*
    The store that holds our domain: boxes and arrows
*/
const store = observable({
    boxes: [],
    arrows: [],
    selection: null
})

/**
    Serialize store to json upon each change and push it onto the states list
*/
const states = []

autorun(() => {
    states.push(serializeState(store))
})

const serializeState = createTransformer(store => ({
    boxes: store.boxes.map(serializeBox),
    arrows: store.arrows.map(serializeArrow),
    selection: store.selection ? store.selection.id : null
}))

const serializeBox = createTransformer(box => ({ ...box }))

const serializeArrow = createTransformer(arrow => ({
    id: arrow.id,
    to: arrow.to.id,
    from: arrow.from.id
}))
```

In this example the state is serialized by composing three different transformation functions.
The autorunner triggers the serialization of the `store` object, which in turn serializes all boxes and arrows.
Let's take closer look at the life of an imaginary example box#3.

1. The first time box#3 is passed by `map` to `serializeBox`,
   the serializeBox transformation is executed and an entry containing box#3 and its serialized representation is added to the internal memoization table of `serializeBox`.
2. Imagine that another box is added to the `store.boxes` list.
   This would cause the `serializeState` function to re-compute, resulting in a complete remapping of all the boxes.
   However, all the invocations of `serializeBox` will now return their old values from the memoization tables since their transformation functions didn't (need to) run again.
3. Secondly, if somebody changes a property of box#3 this will cause the application of the `serializeBox` to box#3 to re-compute, just like any other reactive function in MobX.
   Since the transformation will now produce a new Json object based on box#3, all observers of that specific transformation will be forced to run again as well.
   That's the `serializeState` transformation in this case.
   `serializeState` will now produce a new value in turn and map all the boxes again. But except for box#3, all other boxes will be returned from the memoization table.
4. Finally, if box#3 is removed from `store.boxes`, `serializeState` will compute again.
   But since it will no longer be using the application of `serializeBox` to box#3,
   that reactive function will go back to non-reactive mode.
   This signals the memoization table that the entry can be removed so that it is ready for GC.

So effectively we have achieved state tracking using immutable, shared datas structures here.
All boxes and arrows are mapped and reduced into single state tree.
Each change will result in a new entry in the `states` array, but the different entries will share almost all of their box and arrow representations.

## Transforming a datagraph into another reactive data graph

Instead of returning plain values from a transformation function, it is also possible to return observable objects.
This can be used to transform an observable data graph into a another observable data graph, which can be used to transform... you get the idea.

Here is a small example that encodes a reactive file explorer that will update its representation upon each change.
Data graphs that are built this way will in general react a lot faster and will consist of much more straight-forward code,
compared to derived data graph that are updated using your own code. See the [performance tests](https://github.com/mobxjs/mobx/blob/3ea1f4af20a51a1cb30be3e4a55ec8f964a8c495/test/perf/transform-perf.js#L4) for some examples.

Unlike the previous example, the `transformFolder` will only run once as long as a folder remains visible;
the `DisplayFolder` objects track the associated `Folder` objects themselves.

In the following example all mutations to the `state` graph will be processed automatically.
Some examples:

1. Changing the name of a folder will update its own `path` property and the `path` property of all its descendants.
2. Collapsing a folder will remove all descendant `DisplayFolders` from the tree.
3. Expanding a folder will restore them again.
4. Setting a search filter will remove all nodes that do not match the filter, unless they have a descendant that matches the filter.
5. Etc.

```javascript
var m = require('mobx')

function Folder(parent, name) {
	this.parent = parent;
	m.extendObservable(this, {
		name: name,
		children: m.observable.shallow([]),
	});
}

function DisplayFolder(folder, state) {
	this.state = state;
	this.folder = folder;
	m.extendObservable(this, {
		collapsed: false,
		get name() {
			return this.folder.name;
		},
		get isVisible() {
			return !this.state.filter || this.name.indexOf(this.state.filter) !== -1 || this.children.some(child => child.isVisible);
		},
		get children() {
			if (this.collapsed)
				return [];
			return this.folder.children.map(transformFolder).filter(function(child) {
				return child.isVisible;
			})
		},
		get path() {
			return this.folder.parent === null ? this.name : transformFolder(this.folder.parent).path + "/" + this.name;
		})
	});
}

var state = m.observable({
	root: new Folder(null, "root"),
	filter: null,
	displayRoot: null
});

var transformFolder = m.createTransformer(function (folder) {
	return new DisplayFolder(folder, state);
});


// returns list of strings per folder
var stringTransformer = m.createTransformer(function (displayFolder) {
	var path = displayFolder.path;
	return path + "\n" +
		displayFolder.children.filter(function(child) {
			return child.isVisible;
		}).map(stringTransformer).join('');
});

function createFolders(parent, recursion) {
	if (recursion === 0)
		return;
	for (var i = 0; i < 3; i++) {
		var folder = new Folder(parent, i + '');
		parent.children.push(folder);
		createFolders(folder, recursion - 1);
	}
}

createFolders(state.root, 2); // 3^2

m.autorun(function() {
    state.displayRoot = transformFolder(state.root);
    state.text = stringTransformer(state.displayRoot)
    console.log(state.text)
});

state.root.name = 'wow'; // change folder name
state.displayRoot.children[1].collapsed = true; // collapse folder
state.filter = "2"; // search
state.filter = null; // unsearch
```
