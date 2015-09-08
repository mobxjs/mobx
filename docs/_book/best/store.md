Best practices for managing large projects

* Store as class
* Class: control own reactive properties, define method on prototype
* Instantiatable, useful for testign
* Single domain, values might take multiple forms
* Data fetching only if pluggable
* Guarantee there is only one instance of any each domain object
* Deserialize incoming objects into existing objects!

* Domain objects as classes
* Create through factory on store
* Access all functionality through object, to avoid passing stores around, delegate where needed
* Not necessarily id
* Real references to other objects
