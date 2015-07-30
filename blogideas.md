image with steps that explain

https://gist.github.com/gaearon/074b0905337a6a835d82

add favicon 

"seamless observable"

fast render widget
https://www.codementor.io/reactjs/tutorial/reactjs-vs-angular-js-performance-comparison-knockout#/



@immediatedelay Hi Andrew, I saw that you will be speaking about observables + react. You might find this lib interesting: http://mweststrate.github.io/mobservable/

Now available: simple starters project for #mobservable based on (tnx @dan_abramov for the minimal react-hot-boilerplate project) https://github.com/mweststrate/react-mobservable-boilerplate

@reactjsnews #react
pull request on https://github.com/Legitcode/ReactJSNews


Elm

cydmax [11:16]
you need to pitch it for large scale business grade apps

MOBservable: library to create reactive data structures and functions (and React components that act as observer)

#mobservable makes #frp easy; observe computations instead of streams

#mobservable restores the mathematticaly equality operator; do not assign values but create relationships. #frp


mobservables shine with multiple observers


state of immutable data

- multi thread (but stale)
- memoization
- cheap comparision

- example: go to next book

    - separate model from view
    - separate model from controller
    - separate model from backend (getting data is another concerns as having, changing and rendering data)
    - relay on natural JS concepts: call functions instead of creating actions, use classes, inheritance, objects, arrays as you please
    - mutable data as natural way of thinking return { ...email, read: true} is still a lot less natural then email.read = true (which is faster as well)
    - no declaration of requirements (be able to move components around freely)
    - central place of state
    - no management of subscriptions
    - update smart, update fast
    - references


- the comeback of the true equality operatior, excel, no assignment, no query, true equality: <= which mirrors => nicely

- push changes trough the system instead of pull
- events: push the fact that stuff should be pulled

- data normalization ? flat list, stores..