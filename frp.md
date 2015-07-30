Pure Rendering? Thou shalt not use assignments

Last week Guillermo Raunch wrote in an excellent [blog post](http://rauchg.com/2015/pure-ui/) that the UI should be a pure function of the application state.
And he is right. Pure user interfaces are easy to reason about, to mock, to test. A pure UI can be described as

UI = view(application_state)

Where the view transform the data in something that would be put on the screen. This is also one of the core fundamentals of a user interface libraries such as React.
However, once you start to program the above pattern, you will soon discover that the UI *isn't* a function of the application_state, it *was* a function of the application state.

Now how did this happen? It's all the fault of the assignment operator. In mathematics, the equals sign (`=`) expresses an equation. The left-hand side is an isomorphic equivalence of the right hand sight. That means that every occurrence of `UI` can be read anywhere as `view(application_state)`, and if application_state morphs, so does the UI.

Yet, in programming, the equal sign denotes assignment. Meaning; reduce the right hand site to a value and assign it to the left hand side. Superficially, this seems to be the same. But the problem is that with assignments the UI isn't an isomorph of the view anymore, its a one time copy! This means that if the application state changes, you have to carefully reapply the view function to the UI.

This might not sound as a big deal, but actually it is. First, its awkward to state each time the application state changes that the UI should be updated. In event handlers like the one below it becomes painfully clear that our UI isn't a pure function of state*-over-time*:

function onDeleteButtonClick (todoItem) {
	allTodos.remove(todoItem);
	redrawTodoList();
}

Besides, creating a fresh view from the application state is [expensive](https://www.mendix.com/tech-blog/making-react-reactive-pursuit-high-performing-easily-maintainable-react-apps/) for any decently sized (web) app. So in our event handlers we take guesses which parts of the UI needs an update, or we start attaching events to certain state updates and start listening to those events in our UI components. Bye bye pure function. Welcome, boilerplate filled spaghetti code.

So first we define nice relationship between UI and state. Then it appears that this relationship is just a farce; it isn't maintained by the runtime and so you, as a developer have the honorable job to fix this relationship every time something changes. That doesn't sound like a healthy relationship! It sounds like you should have studied mediation! Can we fix this issue at the root? Can we fix the assignment operator? Can we just write:

UI <= view(application_state)

Where '<=' establishes a relationship between `UI` and the application of `view` to `application_state`. Note that the '<='' operator nicely mirrors the '=>' lambda operator. A function produces a value which you need to propagate carefully through your app, but true isomorphic equality just 'pulls' data towards you.

Central though: user interface code will be of higher quality if we shift from one-time assignment operators to isomorphic relationships between data

Sadly, we don't have such an operator, so the code we write is flooded with statements like "notify that function", "emit this event", "repaint that part of the UI", "now send this update to the server". The complexity and fragility of our apps would be largely reduced if we would no longer write stuff like that.

Is it possible to have an isomorphic equality operator? Yes definitely. Spreadsheet applications like Microsoft Excel do understand correctly what the equality operator is all about.
I strongly believe that it is for that specific reason why Excel is one of the most successful software products of all times. Because in spreadsheets, one can just state:

C100 = SUM(B2:B99) / A1

In Excel the equals sign establishes a proper relationship, where C100 will follow any changes that happen in the B column or A1. Awesome, right? The solution to proper programming is in our midst already for decades!

Functional Reactive Programming is the discipline that applies the principle of reacting to changing data structures to the programming field. However its approach is a bit cumbersome as it expresses relationships as streams. So basically, it is for people way smarter than me. But alas, the direction is good and it does the job. In existing FRP libraries like RxJS or Bacon our relationship would look a bit like:

budgetStream = creditCardLimitStream.combine(reservedMoneyStream, (ccl, rm) => ccl — rm);

So, can we leave all the fluff away and observe expressions instead of streams, like in Excel? Yes we can! The [MOBservable library](https://npmjs.org/package/MOBservable) can do precisely that trick for us. In MOBservable, the syntactical equivalent of 'value <= expr ' is 'value = mobservable(() => expr)'. This is a bit easier to grok, especially because all data dependencies inside expressions are managed automatically. Well, then show me the thing! Well OK, glad you asked, just open a terminal in an empty directory and copy+paste the following command to get started (assuming you have [nodejs](https://nodejs.org) installed:

(yes ""| npm init) && npm install mobservable --save && node -e "global.mobservable=require('mobservable'); require('repl').start({ useGlobal: true});"

There it is! Your JavaScript environment with MOBservable pre-loaded. Now just type (or copy-paste):

var state = mobservable.props({
    nrOfSeats : 500,
    reservations : [],
    seatsLeft : function() { return this.nrOfSetas - this.reservations.length; }
});

var ui = mobservable(function() {
    return "<div>" + state.seatsLeft +"</div>";
});

ui.observe(console.log, true);
state.reservations[0] = "Michel";
state.reservations.push("You?");
state.nrOfSeats = 750;

Output:
note: the output was atomic, each transition in the state results in only one view, there is no rendering where the seatsLeft doesn't match the amount of reservations

second: just changes the nrOfsetas generates a new ui, although its value was used inside the view only indirectly (through seatsLeft)

Did you see how it printed first '<div> 499 </div>', '<div> 498 </div>' and finally '<div> 748 </div>' automatically? That is because our view function was applied to the state automatically whenever a piece of state (that was actually used in the UI) changed! The `props` function created a reactive state for us and we defined the ui as pure function of that state. Finally we pushed any changes in the ui to the console. (That is needed because consoles are not reactive, so observing the ui creates a bridge there). Syntactically it is not perfect, but well, it works in any existing JavaScript environments out-of-the-box and that is worth something as well. And MOBserable does this all this automatically (and atomically) for objects, classes, arrays, functions, simple scalars...

Interested in more? Take a look at a less contrived example like a real Todo app[TODO: link, add to todo app], or play on in the terminal. For those who are wondering how this relationship magic works.. thats for a next blog post. As is an introduction about how to combine these concepts with existing UI frameworks like React or jQuery. For now I have other relationships to take care of... ;-)

Tl;dr: Applications development will become less error prone and more robust to changes if we reduce the amount of local state through our apps by introducing isomorphic equality. That is; an equality operator that stands the test of time. Applying transparent functional reactive programming will get us there.

Oh, and if you are wondering whether you can apply the MOBservable library to your own project right now, the library is currently used in an enterprise scale app, to manage the complete state, back-end integration and especially the view of a data intensive React application (about ~30kloc) while tracking the relationships between the ui and thousands of objects and expressions.

-----

How a proper equality operator should change the art of programming 

In programming the equals character is used a lot ('='); it literally ties all our code together. JavaScript for example provides three different operators based on the equals character, '=', '==' and '===' . The first one denotes assignment, the other two compare values. Yet none of those express the mathematical concept of equality. That is sad, because programming would be fundamentally more easy if this wasn't the case.

Let's take a look at the assignment operator. You can use it to assign values to a variable. For instance:

x = x + 1

equation equivalent isomorph

Seems perfectly legit right?  However, This ain't a valid equation. There is simply no number for which holds that it is one larger than itself (well, OK, except for infinity). In mathematics the equals sign means: the thing on the left equals the thing on the right; you can safely substitute the one for the other, everywhere you want. In programming, assignment means: Reduce the right hand side to a value and store it in the variable on the left hand side. For example:

budget = creditCardLimit - reservedMoney

At first glance this seems to be substitution as well. But this is actually not the case, because the substitution only holds as long as neither CreditCardLimit or ReservedMoney hasn't changed! The assignment operator does not establish a relationship.

So if you change the CreditCardLimit, you might hear the little Budget (usually budgets are little) crying: "CreditCardLimit changed her mind, but she didn't even tell me..!". Well, actually, you won't hear Budget crying because nobody didn't bother to tell him that his relationship with CreditCardLimit has ended abruptly. His value has become stale. 

And guess who has to deal with all those broken relationships? Yes, you, the programmer. So if you thought carefully about your program, you might gently tab Budget on the shoulder whenever you change CreditCardLimit: "beloved little budget, please re-evaluate". And Budget will become happy again. "...oh, probably she just forgot to tell me, it's nothing personal. She probably will tell me next time". But guess what? She won't. You have to tell him. Again.

So, what we want is to denote the following:

budget <= creditCardLimit - reservedMoney

Where '<=' establishes a relationship between budget and the expression 'CardLimit - ReservedMoney'. (Note that the '<='' operator nicely mirrors the '=>' lambda operator. A function produces a value which you need to propagate carefully through your app, but true equality 'pulls' data in)

Sadly, we don't have such an operator, so the code we write is flooded with statements like "notify that function", "emit this event", "repaint that part of the UI", "now send this update to the server". The complexity and fragility of our apps would be largely reduced if we would no longer needed to write stuff like:

reservedMoneyInput.onChange = (event) => {
    reservedMoney = reservedMoneyInput.value;
    recalculateBudget();
    updateBudgetView();
}

See how awkward that is? We update the amount of ReservedMoney, which is fine. But then we need to restore the relationship between Budget and ReservedMoney, and we need to restore the relationship between Budget and the representation of Budget in the UI. If we had envisioned this as our job, we should have studied mediation instead of software engineering! The thing we want to express should be more like:

budget <= creditCardLimit - reservedMoney

<div>{budget}</div> <= budget

reservedMoneyInput.onChange = (event) => {
    reservedMoney = reservedMoneyInput.value;
}

Budget should follow CreditCardLimit and ReservedMoney. The UI should follow budget. And that is all we are willing to state. "Dear runtime environment; these are the relations, preserve them carefully!"

Can such a thing be done? Yes definitely. Spreadsheet applications like Microsoft Excel do understand correctly what the equality operator is all about. And I strongly believe that it is for that specific reason why Excel is one of the most successful software products of all times. Because in spreadsheets, one can just state:

C100 = SUM(B2:B99) / A1

(or for that matter you can even express: Budget = CreditCardLimit - ReservedMoney if you give the spreadsheet cells a proper name)

In Excel the equals sign establishes a proper relationship, where C100 will follow any changes that happen in the B column or A1. Awesome, right? The solution to proper programming is in our midst already for decades!

Functional Reactive Programming is the discipline that applies the principle of reacting to changing data structures to the programming field. However its approach is a bit cumbersome as it expresses relationships as streams. So basically, it is for people way smarter than me. But alas, the direction is good and it does the job. In existing FRP libraries like RxJS or Bacon our relationship would look a bit like:

budgetStream = creditCardLimitStream.combine(reservedMoneyStream, (ccl, rm) => ccl — rm);

So, can we leave all the fluff away and observe expressions instead of streams, like in Excel? Yes we can! The [MOBservable library](https://npmjs.org/package/MOBservable) can do precisely that trick for us. In MOBservable, the syntactical equivalent of 'value <= expr ' is 'value = mobservable(() => expr)'. Then me the think! Well OK, glad you asked, just open a terminal in an empty directory and use the following command to get started (assuming you have [nodejs](https://nodejs.org) installed:

(yes ""| npm init) && npm install mobservable --save && node -e "global.mobservable=require('mobservable'); require('repl').start({ useGlobal: true});"

There it is! Your JavaScript environment with MOBservable pre-loaded. Now just type (or copy-paste):

var state = mobservable.props({
    creditCardLimit : 500,
    reservedMoney : 120,
    budget : function() { return state.creditCardLimit - state.reservedMoney }
});
mobservable.sideEffect(function() {
    console.log("<div>", state.budget, "</div>");
});
state.reservedMoney = 200;

Did you see how it printed first '<div> 380 </div>', and after changing the amount of ReservedMoney it printed automatically '<div> 300 </div>'? Quite neat, right? The change in ReservedMoney automatically updated Budget, which in turn automatically updated the "UI". Without event emitters, streams. There were just some relations defined. '.props' created an object with reactive properties, and sideEffection created a reactive function that supports side-effects. (By default, functions not used by others are optimized away). Syntactically it is not perfect, but well, it works within existing JavaScript environments out-of-the-box and that is worth something as well. And MOBserable works for objects, arrays, functions, values... 

Interested in more? Take a look at a less contrived example like a real Todo app, or play on in the terminal. For those who are wondering how this relationship magic works.. thats for a next blog-post. For now I have other relationships to take care of... ;-)

(Oh, and if you are wondering whether you can use the library right now; the library is currently used already to manage the complete state, back-end integration and view of a well-tested data intensive React application of about ~30kloc)