# Simple Vertec Api [![Build Status](https://travis-ci.org/dimitri-koenig/simple-vertec-api.svg?branch=master)](https://travis-ci.org/dimitri-koenig/simple-vertec-api)

[![npm version](https://badge.fury.io/js/simple-vertec-api.svg)](http://badge.fury.io/js/simple-vertec-api)
[![Test Coverage](https://codeclimate.com/github/dimitri-koenig/simple-vertec-api/badges/coverage.svg)](https://codeclimate.com/github/dimitri-koenig/simple-vertec-api/coverage)
[![Code Climate](https://codeclimate.com/github/dimitri-koenig/simple-vertec-api/badges/gpa.svg)](https://codeclimate.com/github/dimitri-koenig/simple-vertec-api)
[![Dependency Status](https://david-dm.org/dimitri-koenig/simple-vertec-api.svg)](https://david-dm.org/dimitri-koenig/simple-vertec-api)


## Installation

Run this command:
```
$ npm install simple-vertec-api --save
```


## Examples

### Simple query example

```javascript
var SimpleVertecApi = require('simple-vertec-api').SimpleVertecApi;
var api = new SimpleVertecApi('http://localhost', 'my-username', 'my-password', true);

// fetches all active users ordered by their name
var select = 'projektbearbeiter->select(aktiv)->orderby(name)';
var fields = [
    'name', // normal field name
    { // special expression for additional data conversion, same like in sql: select 'briefemail' as 'email'
        alias: 'email',
        expression: 'briefemail'
    }
];
api.query(select, fields).then(function(response) {
    // do something with the result
    console.log(response);
});
```

### Simple array with select parameters

```javascript
var SimpleVertecApi = require('simple-vertec-api').SimpleVertecApi;
var api = new SimpleVertecApi('http://localhost', 'my-username', 'my-password', true);

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
api.query(select, params, fields).then(function(response) {
    // do something with the result
    console.log(response);
});
// rendered select: projektbearbeiter->select(boldid = 12345).offeneleistungen->orderby(datum)
```

### Named parameters for select

```javascript
var SimpleVertecApi = require('simple-vertec-api').SimpleVertecApi;
var api = new SimpleVertecApi('http://localhost', 'my-username', 'my-password', true);

// fetches records between two dates
var select = 'self.verrechneteleistungen->select( (datum >= :startDate) and (datum <= :endDate) )';
var params = [
    startDate: new Date('2015-08-03'), // if you pass a value of type Date, it get's rendered to encodeDate(Year,Month,Day)
    endDate: new Date('2015-08-09')
];
var fields = [
    'minutenInt',
    'minutenExt',
    'datum'
];
api.query(select, params, fields).then(function(response) {
    // do something with the result
    console.log(response);
});
// rendered select: self.verrechneteleistungen->select( (datum >= encodeDate(2015,8,3)) and (datum <= encodeDate(2015,8,9)) )
```

### Using a simple string/number/date for select parameter

```javascript
var SimpleVertecApi = require('simple-vertec-api').SimpleVertecApi;
var api = new SimpleVertecApi('http://localhost', 'my-username', 'my-password', true);

// fetches records between two dates
var select = 'self.offeneleistungen->select(datum = ?)';
var param = new Date('2015-08-03');
var fields = [
    'minutenInt',
    'minutenExt',
    'datum'
];
api.query(select, param, fields).then(function(response) {
    // do something with the result
    console.log(response);
});
// rendered self.offeneleistungen->select(datum = encodeDate(2015,8,3))
```

## API

### new SimpleVertecApi(vertecUrl, username, password, [verbose])

Returns a new SimpleVertecApi object.

* `vertecUrl`: A string containing the url the your vertec server, e.g. `https://vertec.company.com:8090/xml`
* `username`: A string with your vertec username
* `password`: A string with your vertec username
* `verbose` *(optional)*: A boolean which set on true will output additional log data

### SimpleVertecApi#query(select, [params], fields)

Does a query on the server with additional parameters for the select. Returns a [Promise](https://github.com/petkaantonov/bluebird).

* `select`: A string containing the ocl expression for fetching the data
* `params` *(optional)*: An array with placeholders to be replaced in the select, e.g. `select where expression = ?`, or an object with key => value so that named parameters can be used in the select, e.g. `select where expression = :id`. If you only have one parameter you can also use just one `?` and set params to that string/number/date.
* `fields`: An array containing the fields which should be returned. Accepts a string as item, or an object with the fields `expression` and `alias` to do further expressions.


## Contributing

1. [Fork it!](https://github.com/dimitri-koenig/simple-vertec-api/fork)
2. Create your feature branch (`git checkout -b feature/my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin feature/my-new-feature`)
5. Create new Pull Request

## Author

Dimitri König (@dimitrikoenig)

## License

Simple Vertec Api is released under the Apache License V2. See the `LICENSE` file for further details.
