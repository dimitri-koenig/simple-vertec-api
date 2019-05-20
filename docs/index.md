# Welcome to Simple Vertec Api's Documentation

Simple Vertec Api is an simple wrapper around www.vertec.com XML webservice for Node.JS/io.js.
It features solid CRUD support for dealing with Vertec's data.


## Delimination and Responsibility

This XML wrapper will only give you a simpler way of making requests via Vertec's own XML interface. There won't be any validations done for data input (you have to do it or rely on Vertec's validation as it is their responsibility on server side).

Version 3 offers additional query options for further transforming response data, included caching support, parallel request mode and many more.


## Installation

Run this command:
```
$ npm install simple-vertec-api --save
```


## Example for a simple query request

```javascript
var SimpleVertecApi = require('simple-vertec-api').SimpleVertecApi;
var SimpleVertecQuery = require('simple-vertec-api').SimpleVertecQuery;

var api = new SimpleVertecApi('http://localhost/xml', 'http://localhost/auth/xml', 'my-username', 'my-password', true);
SimpleVertecQuery.setApi(api);

new SimpleVertecQuery()
    .whereOcl('Projektbearbeiter')
    .whereSql('aktiv = 1')
    .orderBy('name')
    .addFields('name', 'kuerzel')
    .get()
    .then(function(response) {
        // do something with the result
        console.log(response);
    });
```


## Example for a raw api request

```javascript
var SimpleVertecApi = require('simple-vertec-api').SimpleVertecApi;
var api = new SimpleVertecApi('http://localhost/xml', 'http://localhost/auth/xml', 'my-username', 'my-password', true);

// searches for some records starting from day X
var select = {
	ocl: 'Leistung',
	sqlwhere: "(text like '%?%') and (CreationDateTime >= {ts '? 00:00:00'})",
	sqlorder: 'datum'
};
var params = [
    'search text',
    '2015-08-12'
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

## Use included example

There is one basic example included. To get it up and running you have to follow these steps:

* Run `git clone https://github.com/dimitri-koenig/simple-vertec-api.git`
* cd into `simple-vertec-api/examples` directory
* Run `npm install`
* Copy `server/config.example.js` to `server/config.js` and insert your credentials and vertec server url into that new config file
* Run `npm start`
* Go the the `client` directory and open one example file in your browser
