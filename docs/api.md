# new SimpleVertecApi(xmlUrl, authUrl, username, password, [verbose, defaultRequestOptions])

Returns a new SimpleVertecApi object.

* `xmlUrl`: A string containing the url the your vertec server, e.g. `https://vertec.company.com:8090/xml`
* `authUrl`: A string containing the auth url the your vertec server, e.g. `https://vertec.company.com:8090/auth/xml`
* `username`: A string with your vertec username
* `password`: A string with your vertec username
* `verbose` *(optional)*: A boolean which set on true will output additional log data
* `defaultRequestOptions` *(optional)*: An object with addition request default options which can override standard options

# select(select, [params], fields) -> Promise

Does a query on the server with additional parameters for the select. Returns a [Promise](https://github.com/petkaantonov/bluebird).

* `select`: A string containing the ocl expression for fetching the data, or an object with 'ocl', 'sqlwhere' and 'sqlorder' fields or an objref field with an id or an array of ids for a more advanced query
* `params` *(optional)*: An array with placeholders to be replaced in the query and fields, e.g. `select where expression = ?`, or an object with key => value so that named parameters can be used in the select, e.g. `select where expression = :id`. If you only have one parameter you can also use just one `?` and set params to that string/number.
* `fields` *(optional)*: An array containing the fields which should be returned. Accepts a string as item, or an object with the fields `ocl` and `alias` to do further expressions.


__Simple select example__

```javascript
var SimpleVertecApi = require('simple-vertec-api').SimpleVertecApi;
var api = new SimpleVertecApi('http://my-vertec-domain/xml', 'http://my-vertec-domain/auth/xml', 'my-username', 'my-password', true);

// fetches all active users ordered by their name
var select = 'projektbearbeiter->select(aktiv)->orderby(name)';
var fields = [
    'name', // normal field name
    { // special expression for additional data conversion, same like in sql: select 'briefemail' as 'email'
        alias: 'email',
        ocl:   'briefemail'
    }
];
api.select(select, fields).then(function(response) {
    // do something with the result
    console.log(response);
});
```

__Simple array with select parameters__

```javascript
// fetches records of user 12345 ordered by their date
var select = 'projektbearbeiter->select(boldid = ?).offeneleistungen->orderby(datum)';
var params = [
    12345
];
var fields = [
    'minutenInt',
    'minutenExt',
    'datum'
];
api.select(select, params, fields).then(function(response) {
    // do something with the result
    console.log(response);
});
// rendered select: projektbearbeiter->select(boldid = 12345).offeneleistungen->orderby(datum)
```

__Named parameters for select__

```javascript
// fetches records between two dates
var select = 'self.verrechneteleistungen->select( (datum >= encodeDate(:startDate) and (datum <= encodeDate(:endDate)) )';
var params = [
    startDate: '2015,08,03',
    endDate: '2015,08,09'
];
var fields = [
    'minutenInt',
    'minutenExt',
    'datum'
];
api.select(select, params, fields).then(function(response) {
    // do something with the result
    console.log(response);
});
// rendered select: self.verrechneteleistungen->select( (datum >= encodeDate(2015,8,3)) and (datum <= encodeDate(2015,8,9)) )
```

__Using a simple string/number for select parameter__

```javascript
// fetches records between two dates
var select = 'self.offeneleistungen->select(datum = encodeDate(?))';
var param = '2015-08-03';
var fields = [
    'minutenInt',
    'minutenExt',
    'datum'
];
api.select(select, param, fields).then(function(response) {
    // do something with the result
    console.log(response);
});
// rendered self.offeneleistungen->select(datum = encodeDate(2015,8,3))
```

__Advanced sql select__

```javascript
// searches for some records starting from day X
var select = {
	ocl: 'Leistung',
	sqlwhere: "(text like '%?%') and (CreationDateTime >= {ts '? 00:00:00'})",
	sqlorder: 'datum'
};
var params = [
    'search text',
    '2015-08-05'
];
var fields = [
    'minutenInt',
    'minutenExt',
    'datum',
    'text'
];
api.select(select, params, fields).then(function(response) {
    // do something with the result
    console.log(response);
});
```

```javascript
// searches for some records starting from day X, using params object
var select = {
    ocl: 'Leistung',
    sqlwhere: "(text like '%:searchText%') and (CreationDateTime >= {ts ':date 00:00:00'})",
    sqlorder: 'datum'
};
var params = {
    searchText: 'search text',
    date: '2015-08-05'
};
var fields = [
    'minutenInt',
    'minutenExt',
    'datum',
    'text',
    {
        alias: 'datum-:date',
        ocl: 'datum'
    }
}
];
api.select(select, params, fields).then(function(response) {
    // do something with the result
    console.log(response);
});
```


# findById(id, [params], fields) -> Promise

Does a select query on the server to find some objects by their id/ids. Returns a [Promise](https://github.com/petkaantonov/bluebird).

* `id`: A single number or an array of numbers
* `params` *(optional)*: An array with placeholders to be replaced in the fields, or an object with key => value so that named parameters can be used. If you only have one parameter you can also use just one `?` and set params to that string/number.
* `fields` *(optional)*: An array containing the fields which should be returned. Accepts a string as item, or an object with the fields `ocl` and `alias` to do further expressions.

# delete(id) -> Promise

Does a delete query on the server to delete some ids. Returns a [Promise](https://github.com/petkaantonov/bluebird).

* `id`: A single number or an array of numbers

# save([objectsArray], [className, data]) -> Promise

Does a save query on the server to some records. Returns a [Promise](https://github.com/petkaantonov/bluebird).

Either:

* `objectsData`: An array of objects with each having a `className` string field and `data` object field

Or:

* `className`: String with target vertec class like `OffeneLeistung`
* `data`: Object of fields to use for the new record

If in the data array the field `objref` is found, an update operation will be made. If there isn't such a field, a create operation will be made.


__Multiple identical & simultaneous requests__

Multiple identical & simultaneous requests will be temporarily stored and thus only one promise returned. Because every query is stateless and contains every information it needs there shouldn't be any issues even with different user data.