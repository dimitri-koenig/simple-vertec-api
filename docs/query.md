# new SimpleVertecQuery()

Returns a new SimpleVertecQuery object.


# setApi(api) -> void

Sets the api object for all the requests.

* *SimpleVertecApi* `api`: An instance of SimpleVertecApi


__Example__

```javascript
var SimpleVertecApi = require('simple-vertec-api').SimpleVertecApi;
var SimpleVertecQuery = require('simple-vertec-api').SimpleVertecQuery;

var api = new SimpleVertecApi('http://localhost', 'my-username', 'my-password', true);
SimpleVertecQuery.setApi(api);
```


# setMemcached(cache) -> void

Sets global cache instance of memcached for every instance.

* *memcached* `cache`: An instance of memcached


__Example__

```javascript
var SimpleVertecQuery = require('simple-vertec-api').SimpleVertecQuery;

var memcached = require('memcached');
let _cache = new memcached('localhost:11211', {maxValue: 1024*1024*15});
SimpleVertecQuery.setMemcached(_cache);
```


# setAppCacheKey(appCacheKey) -> void

Sets global app cache key for every instance.

* *string* `appCacheKey`: App cache key


__Example__

```javascript
var SimpleVertecQuery = require('simple-vertec-api').SimpleVertecQuery;

SimpleVertecQuery.setAppCacheKey('my-vertec-app-v1');
```



# findById(ids) -> SimpleVertecQuery

Finds one or many ids. Returns instance of itself for chaining.

* *number[]* `ids`: One id or an array of ids


__Example 1__

```javascript
new SimpleVertecQuery()
    .findById(123)
    .addFields('name', 'kuerzel')
    .get()
    .then(function(response) {
        // do something with the result
        console.log(response);
    });
```

__Example 2__

```javascript
new SimpleVertecQuery()
    .findById([123, 234])
    .addFields('name', 'kuerzel')
    .get()
    .then(function(response) {
        // do something with the result
        console.log(response);
    });
```



# whereOcl(ocl) -> SimpleVertecQuery

Adds ocl expression to select. Returns instance of itself for chaining.

* *string* `ocl`: Ocl expression


__Example__

```javascript
new SimpleVertecQuery()
    .whereOcl('Projektbearbeiter')
    .get()
    .then(function(response) {
        // do something with the result
        console.log(response);
    });
```



# whereSql(sql) -> SimpleVertecQuery

Adds sql where expression to select. Returns instance of itself for chaining.

* *string* `sql`: Sql where expression


__Example__

```javascript
new SimpleVertecQuery()
    .whereOcl('Projektbearbeiter')
    .whereSql('aktiv = 1')
    .addFields('name', 'kuerzel')
    .get()
    .then(function(response) {
        // do something with the result
        console.log(response);
    });
```



# orderBy(order) -> SimpleVertecQuery

Adds order expression. Returns instance of itself for chaining.

* *string* `order`: Order expression


__Example__

```javascript
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



# addParam(value) -> SimpleVertecQuery

Adds param value for injecting into fields (only as object) and select expressions. Returns instance of itself for chaining.

For more examples see api and params handling.

* *mixed* `value`: Mixed value parameter


__Example__

```javascript
var paramObject = {
    field1: 'name',
    field2: 'kuerzel'
};

new SimpleVertecQuery()
    .whereOcl('Projektbearbeiter')
    .addFields(':field1', ':field2')
    .addParam(paramObject)
    .get()
    .then(function(response) {
        // do something with the result
        console.log(response);
    });
```



# addParams(...values) -> SimpleVertecQuery

Adds param values for injecting into fields (only as object) and select expressions. Returns instance of itself for chaining.

Either the first argument is an array containing parameters or every every argument is an parameter.

* *mixed* `values`: Mixed value parameters


__Example__

```javascript
new SimpleVertecQuery()
    .whereOcl('Projektbearbeiter')
    .addFields('?', '?')
    .addParams('name', 'kuerzel')
    .get()
    .then(function(response) {
        // do something with the result
        console.log(response);
    });
```



# addField(value, [alias]) -> SimpleVertecQuery

Adds one field to field array. Returns instance of itself for chaining.

* *mixed* `value`: Mixed value parameter
* *string | object* `value`: Either a string with the field or an object containing ocl and alias expressions
* *string* `alias` *optional*: Optional alias string if value is a string containing an ocl expression


__Example__

```javascript
new SimpleVertecQuery()
    .whereOcl('Projekt')
    .addField('code', 'projectTitle')
    .get()
    .then(function(response) {
        // do something with the result
        console.log(response);
    });
```



# addFields(values...) -> SimpleVertecQuery

Adds multiple fields to field array. Returns instance of itself for chaining.

Either the first argument is an array containing fields or every every argument (either a string or object) is a field.

* *mixed* `values`: Mixed value parameters


__Example__

```javascript
new SimpleVertecQuery()
    .whereOcl('Projektbearbeiter')
    .addFields(['name', 'kuerzel'])
    .get()
    .then(function(response) {
        // do something with the result
        console.log(response);
    });
```



# setCacheTTL(seconds) -> SimpleVertecQuery

Sets cache duration time in seconds and thus activates caching. Returns instance of itself for chaining.

If no cacheKey is set, the hashed value of the request xml will be used as cacheKey.

* *number* `seconds`: Seconds for item to be in cache


__Example__

```javascript
new SimpleVertecQuery()
    .whereOcl('Projektbearbeiter')
    .addFields(['name', 'kuerzel'])
    .setCacheTTL(60*60*24)
    .get()
    .then(function(response) {
        // do something with the result
        console.log(response);
    });
```



# setCacheGraceTime(seconds) -> SimpleVertecQuery

Additional grace seconds for item to remain in cache while it's getting renewed. Returns instance of itself for chaining.

Response data will include onGrace flag.

* *number* `seconds`: Seconds for item to be additionally in cache


__Example__

```javascript
new SimpleVertecQuery()
    .whereOcl('Projektbearbeiter')
    .addFields(['name', 'kuerzel'])
    .setCacheTTL(60*60)
    .setCacheGraceTime(60*60*24)
    .get()
    .then(function(response) {
        // do something with the result
        console.log(response);
    });
```



# setCacheKey(value) -> SimpleVertecQuery

Sets cache key for that cache entry. Returns instance of itself for chaining.

Useful for caching a request which has changing parameters but still returns similar data (like changing dates or finance data for a static report).

* *string* `value`: Item cache key


__Example__

```javascript
new SimpleVertecQuery()
    .whereOcl('Projektbearbeiter')
    .addFields(['name', 'kuerzel'])
    .setCacheTTL(60*60)
    .setCacheKey('my-team')
    .get()
    .then(function(response) {
        // do something with the result
        console.log(response);
    });
```



# addTransformer(transformer) -> SimpleVertecQuery

Adds a transformer function which will be called after a request returns a response. Returns instance of itself for chaining.

Each transformer closure should return the transformed value.

* *function* `transformer`: Transformer function


__Example 1__

```javascript
new SimpleVertecQuery()
    .whereOcl('Projektbearbeiter')
    .addTransformer(function(rawResponse) {
        // do something with the result and return a response for the next transformer

        return newResponse;
    })
    .get()
    .then(function(response) {
        // do something with the result
        console.log(response);
    });
```


__Example 2__

```javascript
new SimpleVertecQuery()
    .whereOcl('Projektbearbeiter')
    .addTransformer(function(rawResponse1) {
        // do something first with the data and return for the next transformer

        return newResponse;
    })
    .addTransformer(function(rawResponse2) {
        // follows after first transformer and gets its returned data as new response

        return newResponse;
    })
    .get()
    .then(function(response) {
        // do something with the result
        console.log(response);
    });
```



# filterProperty(key, toArray = false) -> SimpleVertecQuery

Sets a property filter which extracts the result for the specific property. Returns instance of itself for chaining.

* *string* `key`: Property key to extract
* *boolean* `toArray`: Optionally converts value to an array


__Example__

```javascript
new SimpleVertecQuery()
    .findById([123, 234])
    .filterProperty('Projektbearbeiter', true)
    .get()
    .then(function(response) {
        // do something with the result
        console.log(response);
    });
```



# setRootKey(newKey) -> SimpleVertecQuery

Sets optional root key for data to be capsuled. Returns instance of itself for chaining.

Default property is `data`.

* *string* `newKey`: New root key


__Example__

```javascript
new SimpleVertecQuery()
    .findById([123, 234])
    .setRootKey('users')
    .get()
    .then(function(response) {
        // do something with the result
        console.log(response);
    });
```



# zip(path, keyToCheck = null, forceArray = true) -> SimpleVertecQuery

Zips together the properties of the property at path's position. Returns instance of itself for chaining.

Wildcards using '*' are allowed too.

* *string* `path`: Path to the object property
* *null|string* `keyToCheck`: Uses key to check wether result is a valid object
* *boolean* `forceArray`: Forces path to become an array


__Example__

```javascript
new SimpleVertecQuery()
    .whereOcl('Projekt')
    .addFields([
        {
            ocl: 'phasen.boldid->listToString("===")',
            alias: 'phases.objid'
        },
        {
            ocl: 'phasen.code->listToString("===")',
            alias: 'phases.code'
        }
    ])
    .zip('phases', 'objid')
    .get()
    .then(function(response) {
        // do something with the result
        console.log(response);
    });
```



# inParallel(value = true) -> SimpleVertecQuery

Toggles parallel fetching mode of multiple objrefs. Returns instance of itself for chaining.

* *boolean* `value`: Sets parallel mode


__Example__

```javascript
new SimpleVertecQuery()
    .findById([123, 234])
    .inParallel()
    .get()
    .then(function(response) {
        // do something with the result
        console.log(response);
    });
```



# get(refresh = false) -> SimpleVertecQuery

Sends a request with all settings and returns response. Returns instance of itself for chaining.

* *boolean* `refresh`: Forces a new request, even if caching is on.


__Example__

```javascript
new SimpleVertecQuery()
    .findById([123, 234])
    .get(true)
    .then(function(response) {
        // do something with the result
        console.log(response);
    });
```
