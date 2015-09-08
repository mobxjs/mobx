# Best Practices for building large scale maintainable projects

This section contains some best practices we discovered at Mendix while working with Mobservable.
This section is opiniated and you are in no way forced to apply this practices.
There are many ways of working with Mobservable and React, and this is just one of them.

# Stores

Let's start with _stores_.
In the next sections we will discuss _actions_ and React _components_ as well.
Stores are can be found in any flux architecture and can be compared a bit with controllers in the MVC pattern.
The main responsibility of stores is to move _logic_ and _state_ out of your components into a standalone testable unit that can be used in both frontend and backend javascript.

## Stores for the user interface state

Most applications benefit from having at least two stores.
One for the _ui state_ and one or more for the _domain state_.
The advantage of separating those two is you can reuse and test _domain state_ universally, and you might very well reuse it in other applications.
The _ui-state-store_ however is often very specific for your application.
But usually very simple as well.
This store typically doesn't have much logic in it, but will store a plethorea of loosely coupled pieces of information about the ui.
This is ideal as most applications will change the ui state often during the development process.

Things you will typically find in ui stores:
* Session information
* Information about how far you applications has loaded
* Information that will not be stored in the backend
* Information that affects the UI globally
  * Window dimensions
  * Accessibility information
  * Current language
  * Currently active theme 
* User interface state as soon as it effects multiple, further unrelated components:
  * Current selection
  * Visibility of toolbars, etc..
  * State of a wizard
  * State of a global overlay

It might very well be that these pieces of information start as internal state of a specific component (for example the visibility of a toolbar).
But after a while you discover that you need this information somewhere else in your application.
Instead of pushing state in such a case upwards in the component tree, like you would do in plain react apps, you just move that state to the _ui-state-store_.

Make sure this state is a singleton.
For isomorphic applications you might also want to provide a stub implementation of this store with sane defaults so that all components render as expected.
You might distribute the _ui-state-store_ through your application by passing it as property through your component tree.
You can also pass this store by using context or make it globally available as a module.
For testing purposes, I recommend to just pass it through the component tree.
  
Example of a store (using ES6 syntax):

```javascript
import {extendReactive} from 'mobservable';
import jquery from 'jquery';

class UiState {
	constructor() {
        const $window = jquery(window);
        extendReactive(this, {
            // make window dimensions available as reactive information
            windowDimensions: this.getWindowDimensions(),
            
            // active translation
            language: "en_US",
            
            // info about pending requests, used for the component that shows the current sync state
            pendingRequestCount: 0,
            appIsInSync: function() {
                return this.pendingRequestCount === 0
            }
        });
        
        jquery.resize(() => {
            this.windowDimensions = getWindowDimensions();
        });
    }
    
    getWindowDimensions() {
        return { 
            width: $(window).width(),
            height: $(window).height()     
        };
    }
}

singleton = new UiState();
export default singleton;
```

## Domain Stores

Your application will contain one or multiple _domain_ stores.
These stores store the data your application is all about.
Todo items, users, books, movies, orders, you name it.
Your application will most probably have at least one domain store.

A single domain store should be responsible for a single concept in your application.
However a single concept might take the form of multiple subtypes and it often a (cyclic) tree structure.
For example: one domain store for your products, and one for our orders and orderlines.
As a rule of thumb: if the nature of the relationship between two items is containment, they should typically be in the same store.
So a store just manages _domain objects_.

These are the responsibility of a store:
* Instantiate domain objects. Make sure domain objects know the store they belong to.
* Make sure there is only one instance of each of your domain objects.
The same user, order or todo should not be twice in your memory.
This way you can safely use refences and also be sure you are looking at the latest instance, without ever having to resolve a references.
This is fast, straight forward and convenient when debugging.
* Provide backend integration. Store data when needed.
* Update existing instances if updates are received from the backend.
* Provide a stand-alone, universal, testable component of your application.
* To make sure your store is testable and can be run server-side, you probably will move doing actual websocket / http requests to a separate object so that you can abstract over your communication layer.
* There should be only one instance of a store.

### Domain objects
Each domain object should be expressed using its own class (or constructor function).
It is recommended to store your data in _denormalized_ form.
There is no need to treat your client-side application state as some kind of database.
Real references, cyclic data structures and instance methods are powerful concepts in javascript.
Domain objects are allowed to refer directly to domain objects from other stores.
Remember; we want to keep our actions and views as simple as possible and needing to manage references and doing garbage collection yourself might be a step backward.
Unlike many flux architectures, with `mobservable` there is no need to denormalize your data, and this makes it a lot simpler to build the _essentially_ complex parts of your application:
Your business rules, actions and user interface.

Domain objects can delegate all their logic to the store they belong to if that suits your application well.
It is possible to express your domain objects as plain objects, but classes have some important advantages over plain objects:
* They can have methods.
This makes your domain concepts easier to use stand-alone and reduces the amount of contextual awareness that is needed in your application.
Just pass objects around.
You don't have to pass stores around, or have to figure out which actions can be applied to an object if they are just available as instance methods.
Especially in large applications this is important.
* They offer fine grained control over the visibility of attributes and methods.
* Objects created a using a constructor function can freely mix reactive properties and functions, and non-reactive properties and methods.
* They are easily recognizable and can strictly be type-checked.


### Example domain store

```javascript

class OrderStore {
    constructor(transportLayer, productStore) {
        
    }   
}

```