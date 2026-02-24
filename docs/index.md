# Welcome to Simple Vertec Api's Documentation

Simple Vertec Api is an simple wrapper around www.vertec.com XML webservice for Node.JS/io.js.
It features solid CRUD support for dealing with Vertec's data.


## Delimination and Responsibility

This XML wrapper will only give you a simpler way of making requests via Vertec's own XML interface. There won't be any validations done for data input (you have to do it or rely on Vertec's validation as it is their responsibility on server side).

It offers query options for further transforming response data, caching support, concurrency limiting, retry logic, and many more.


## Installation

Run this command:
```
$ npm install simple-vertec-api --save
```


## Example for a simple query request

```javascript
import {SimpleVertecApi, SimpleVertecQuery} from 'simple-vertec-api';

const api = new SimpleVertecApi('https://my-vertec-domain/xml', 'my-api-key', true);
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
import {SimpleVertecApi} from 'simple-vertec-api';
const api = new SimpleVertecApi('https://my-vertec-domain/xml', 'my-api-key', true);

// searches for some records starting from day X
const select = {
	ocl: 'Leistung',
	sqlwhere: "(text like '%?%') and (CreationDateTime >= {ts '? 00:00:00'})",
	sqlorder: 'datum'
};
const params = [
    'search text',
    '2015-08-12'
];
const fields = [
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
