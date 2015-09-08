Best practices for managing large projects

* separate store(s) for ui state
* Store as class
* Class: control own reactive properties, define method on prototype
* Instantiatable, useful for testign
* Single domain, values might take multiple forms
* Data fetching and storing should be controlled by the store, but the actual transportation layer should be pluggable so that the stores and domain classes can be run on frontend and backend, and tested in isolation
* Guarantee there is only one instance of any each domain object
* Deserialize incoming objects into existing objects!

* Domain objects as classes
* Create through factory on store
* Access all functionality through object, to avoid passing stores around, delegate where needed
* Not necessarily id
* Real references to other objects
