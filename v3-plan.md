# Plan for v3 changed

# select(ocl)

Does a query on the server to fetch multiple rows.

* `ocl`: A string containing the ocl expression or sql class.

To fire the request and get a [Promise](https://github.com/petkaantonov/bluebird) you can use the additional method `get()` like this:

`select('self.offeneleistungen').get()`

The following optional methods can further specify the query:

* `bindParameters(params)`: An array with placeholders to be replaced in the query and fields, e.g. `select where expression = ?`, or an object with key => value so that named parameters can be used in the select, e.g. `select where expression = :id`. If you only have one parameter you can also use just one `?` and set params to that string/number.
* `setResultFields(fields)`: An array containing the fields which should be returned. Accepts a string as item, or an object with the fields `ocl` and `alias` to do further expressions.
* `setObjref(ids)`: An single object id or an array of object ids to fetch directly.
* `setSqlwhere(whereClause)`: Sets an additional where clause which also translates into this query being handled as an sql query.
* `setSqlorder(field)`: Sets the order for an sql query.


# findById(id)

Does a select query on the server to find some objects by their id/ids.

* `id`: A single number or an array of numbers

To fire the request and get a [Promise](https://github.com/petkaantonov/bluebird) you can use the additional method `get()` like this:

`findById(123).get()`

The following optional methods can further specify the query:

* `setResultFields(fields)`: An array containing the fields which should be returned. Accepts a string as item, or an object with the fields `ocl` and `alias` to do further expressions.


# delete(id)

Does a delete query on the server to delete some ids. Returns a [Promise](https://github.com/petkaantonov/bluebird).
This method does not change compared to version 2.

* `id`: A single number or an array of numbers

