# Welcome to Simple Vertec Api's Documentation

Simple Vertec Api is an simple wrapper around www.vertec.com XML webservice for Node.JS/io.js.
It features solid CRUD support for dealing with Vertec's data.

## Installation

Run this command:
```
$ npm install simple-vertec-api --save
```


## Example for getting started

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
