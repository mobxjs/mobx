# Introduction

Mobservable makes data _observable_, so that _views_ update reactively.

![Mobservable + React](images/concept.png)

* [Mobservable on Github](https://github.com/mweststrate/mobservable)
* For the impatient: [Five minute interactive introduction to Mobservable](http://mweststrate.github.io/mobservable/getting-started.html)

## Philosophy

Mobservable isn't a library that helps you to write fancy code.
It helps you to remove fancy code, so that just boring, simple code remains.
Because simple code<sup>1</sup> is the secret recipe to building enterprise scale software that is easy to change and maintain.
Simple code allows you to quickly change the essential parts<sup>2</sup> of your application.

**With Mobservable you can write views like there is only one state ever.**

So what happens when you alter the state? No worries, Mobservable makes sure that any view you have is kept in sync with the state efficiently<sup>3</sup>.
The only thing that is left for you is to write boring views and straightforward actions.
These are some examples of fancy code that you _no longer need_ when using Mobservable:

* Verbose, boilerplated actions that alter state using unwieldy database query like constructions.
* Clever constructions that allows you to 'mutate' immutable data.
* Data subscriptions, cursors, lenses or higher order components; in short any construction to configure how views should be kept in sync with the application state.

## How does it work?

Mobservable applies _Transparent Reactive Functional Programming_ to determine when views needs an update.
This is an old technique that is used by spreadsheet applications.
In spreadsheets the cells that hold a value are the _state_, and each cell that holds a formula is a _view_.
While spreadsheets just work with simple values, Mobservable does the same job for all common JavaScript structures; primitives, plain objects, arrays, classes, references etc.

Intrigued? Read on and take a dive in the world of Mobservable.

## Testimonials

> _We ported the book Notes and Kanban examples to Mobservable. Check out [the source](https://github.com/survivejs/mobservable-demo) to see how this worked out. Compared to the original I was definitely positively surprised. Mobservable seems like a good fit for these problems._
> &dash; Juho Vepsäläinen, author of "SurviveJS - Webpack and React" and jster.net curator

> _I was reluctant to abandon immutable data and the PureRenderMixin, but I no longer have any reservations. I can't think of any reason not to do things the simple, elegant way you have demonstrated._
> &dash;David Schalk, fpcomplete.com

> _Elegant! I love it!_
> &dash; Johan den Haan, CTO Mendix

> _Great job with Mobservable! Really gives current conventions and libraries a run for their money._
> &dash; Daniel Dunderfelt


----

1. [The best code is no code at all](http://blog.codinghorror.com/the-best-code-is-no-code-at-all/)
2. [No Silver Bullet — Essence and Accidents of Software Engineering](https://en.wikipedia.org/wiki/No_Silver_Bullet)
3. [Pure Rendering in the light of State and Time](https://medium.com/@mweststrate/pure-rendering-in-the-light-of-time-and-state-4b537d8d40b1)
4. [Making React reactive: the pursuit of high performing, easily maintainable React apps](mendix.com/tech-blog/making-react-reactive-pursuit-high-performing-easily-maintainable-react-apps/)
