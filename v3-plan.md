# Plan for v3 changed

# select(ocl)

`select(ocl)` takes one string parameter which specifies an ocl expression or ocl class.

To fire the request and get a [Promise](https://github.com/petkaantonov/bluebird) you can use the additional method `get()` like this:

`select('self.offeneleistungen').get()`

The following optional methods can further specify the query:

* `bindParameters(params)`: An array with placeholders to be replaced in the query and fields, e.g. `select where expression = ?`, or an object with key => value so that named parameters can be used in the select, e.g. `select where expression = :id`. If you only have one parameter you can also use just one `?` and set params to that string/number.
* `setResultFields(fields)`: An array containing the fields which should be returned. Accepts a string as item, or an object with the fields `ocl` and `alias` to do further expressions.
* `setObjref(ids)`: An single object id or an array of object ids to fetch directly.
* `setSqlwhere(whereClause)`: Sets an additional where clause which also translates into this query being handled as an sql query.
* `setSqlorder(field)`: Sets the order for an sql query.