# Simple Vertec Api [![Build Status](https://travis-ci.org/dimitri-koenig/simple-vertec-api.svg?branch=master)](https://travis-ci.org/dimitri-koenig/simple-vertec-api)

[![npm version](https://badge.fury.io/js/simple-vertec-api.svg)](http://badge.fury.io/js/simple-vertec-api)
[![Test Coverage](https://codeclimate.com/github/dimitri-koenig/simple-vertec-api/badges/coverage.svg)](https://codeclimate.com/github/dimitri-koenig/simple-vertec-api/coverage)
[![Code Climate](https://codeclimate.com/github/dimitri-koenig/simple-vertec-api/badges/gpa.svg)](https://codeclimate.com/github/dimitri-koenig/simple-vertec-api)
[![Dependency Status](https://david-dm.org/dimitri-koenig/simple-vertec-api.svg)](https://david-dm.org/dimitri-koenig/simple-vertec-api)

Simple Vertec Api is an simple wrapper around www.vertec.com XML webservice for Node.JS/io.js. It features solid CRUD support for dealing with Vertec's data.

[Documentation](http://simple-vertec-api.readthedocs.org/en/latest/)


## Delimination and Responsibility

This XML wrapper will only give you a simpler way of making requests via Vertec's own XML interface. There won't be any validations done for data input (you have to do it or rely on Vertec's validation as it is their responsibility on server side), nor will there be any additional features which would go beyond wrapping just the XML request part in a simple manner.


## Installation

Run this command:
```
$ npm install simple-vertec-api --save
```


## Example

```javascript
var SimpleVertecApi = require('simple-vertec-api').SimpleVertecApi;
var api = new SimpleVertecApi('http://localhost', 'my-username', 'my-password', true);

// searches for some records starting from day X
var select = {
	ocl: 'Leistung',
	sqlwhere: "(text like '%?%') and (CreationDateTime >= {ts '? 00:00:00'})",
	sqlorder: 'datum'
};
var params = [
    'search text',
    '2015-08-22'
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


## Versioning

From 2.0.0 and up `Simple Vertec Api` will follow SEMVER.


## Resources
- [Changelog](https://github.com/dimitri-koenig/simple-vertec-api/blob/master/CHANGELOG.md)
- [Getting Started](http://simple-vertec-api.readthedocs.org/en/latest/)
- [Api Reference with examples](http://simple-vertec-api.readthedocs.org/en/latest/api/)


## Contributing

1. [Fork it!](https://github.com/dimitri-koenig/simple-vertec-api/fork)
2. Create your feature branch (`git checkout -b feature/my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin feature/my-new-feature`)
5. Create new Pull Request


## Author

Dimitri König (@dimitrikoenig)


## License

The Simple Vertec Api is open-sourced software licensed under the [MIT license](http://opensource.org/licenses/MIT)
