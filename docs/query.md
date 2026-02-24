# new SimpleVertecQuery([overwriteOptions])

Returns a new SimpleVertecQuery object.

* `overwriteOptions` *(optional)*: An object to pre-configure any query option at construction time. Accepted keys:
    * `query`: Object — the query selection (e.g. `{ ocl: '...' }` or `{ objref: 123 }`)
    * `params`: Array or Object — parameters for injection into query/fields
    * `fields`: Array — fields to return
    * `cacheKey`: String — custom cache key
    * `cacheName`: String — cache name segment
    * `cacheTTL`: Number — cache duration in seconds (enables caching when > 0)
    * `cacheGraceTime`: Number — additional grace seconds
    * `transformer`: Array — array of transformer functions
    * `propertyFilter`: Object — `{ key, toArray }` for property extraction
    * `rootKey`: String — root key for response wrapping (default: `'data'`)
    * `slowLane`: Boolean — route through slow lane pool (default: `false`)

__Example__

```javascript
// Pre-configure a reusable query template
const query = new SimpleVertecQuery({
    query: { ocl: 'Projektbearbeiter' },
    fields: ['name', 'kuerzel'],
    cacheTTL: 3600,
    rootKey: 'users'
});

query.get().then(function(response) {
    console.log(response.users);
});
```


# setApi(api) -> void

Sets the api object for all the requests.

* *SimpleVertecApi* `api`: An instance of SimpleVertecApi


__Example__

```javascript
import {SimpleVertecApi, SimpleVertecQuery} from 'simple-vertec-api';

const api = new SimpleVertecApi('https://my-vertec-domain/xml', 'my-api-key', true);
SimpleVertecQuery.setApi(api);
```


# setCache(cache) -> void

Sets global cache instance for every instance. Accepts any cache implementation compatible with `@momsfriendlydevco/cache`.

* *object* `cache`: A cache instance with `get(key)` and `set(key, value, ttl)` methods returning Promises. The `ttl` passed to `set()` is in **milliseconds** (internally converted from `(cacheTTL + cacheGraceTime) * 1000`).


__Example__

```javascript
import {SimpleVertecQuery} from 'simple-vertec-api';
import Cache from '@momsfriendlydevco/cache';

const cache = new Cache();
await cache.init();

SimpleVertecQuery.setCache(cache);
```


# setAppCacheKey(appCacheKey) -> void

Sets global app cache key prefix for every instance. Used as the first segment in cache key generation.

* *string* `appCacheKey`: App cache key prefix (default when not set: `'svq'`)

Cache keys are generated in the format:

```
{appCacheKey|'svq'}-{cacheName}-{cacheKey|md5(xml)}-{cacheTTL}
```

Empty segments are omitted. For example, with `appCacheKey = 'myapp'`, `cacheName = 'team'`, `cacheKey = 'active'`, and `cacheTTL = 3600`, the generated key is `myapp-team-active-3600`. If no custom `cacheKey` is set, an md5 hash of the full request XML is used instead.


__Example__

```javascript
import {SimpleVertecQuery} from 'simple-vertec-api';

SimpleVertecQuery.setAppCacheKey('my-vertec-app-v1');
```



# findById(id) -> SimpleVertecQuery

Finds one object by its id. Returns instance of itself for chaining.

* *number* `id`: One id


__Example__

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
const paramObject = {
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

This implements a **stale-while-revalidate** pattern: when a cached item has expired past its TTL but is still within the grace period, the stale data is returned immediately to the caller while a background request refreshes the cache for subsequent callers.

* *number* `seconds`: Seconds for item to be additionally in cache

When caching is enabled, responses include a `meta` object with the following properties:

* `meta.cacheDateTime`: Unix timestamp (seconds) when the item was cached
* `meta.softExpire`: Unix timestamp (seconds) when the item's TTL expires (grace period begins)
* `meta.onGrace`: `true` if the returned data is stale and a background refresh is in progress
* `meta.refresh`: `true` if the request was explicitly refreshed via `get(true)`


__Example__

```javascript
new SimpleVertecQuery()
    .whereOcl('Projektbearbeiter')
    .addFields(['name', 'kuerzel'])
    .setCacheTTL(60*60)
    .setCacheGraceTime(60*60*24)
    .get()
    .then(function(response) {
        if (response.meta.onGrace) {
            // data is stale but still usable, cache is being refreshed in the background
        }
        console.log(response.data); // the actual query result
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



# setCacheName(value) -> SimpleVertecQuery

Sets an optional cache name used in cache key generation. Returns instance of itself for chaining.

The cache name is included as a segment in the generated cache key, making it easier to identify and group related cache entries.

* *string* `value`: Cache name

__Example__

```javascript
new SimpleVertecQuery()
    .whereOcl('Projektbearbeiter')
    .addFields(['name', 'kuerzel'])
    .setCacheTTL(60*60)
    .setCacheName('team-members')
    .setCacheKey('active')
    .get()
    .then(function(response) {
        // cache key will be: app-team-members-active-3600
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
    .findById(123)
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
    .findById(123)
    .setRootKey('users')
    .get()
    .then(function(response) {
        // do something with the result
        console.log(response);
    });
```



# usingSlowLane(slowLane = true) -> SimpleVertecQuery

Routes this query through the slow lane pool for heavy or deprioritized requests. Returns instance of itself for chaining.

The slow lane uses a separate concurrency pool from the default request queue, so heavy slow lane requests don't block normal requests. See [api docs](api.md#slow-lane) for pool configuration.

* *boolean* `slowLane` *(optional)*: Enable or disable slow lane (default: `true`)


__Example__

```javascript
// Heavy export that shouldn't block normal lookups
new SimpleVertecQuery()
    .whereOcl('Projekt')
    .addFields('code', 'beschrieb', 'phasen', 'team')
    .usingSlowLane()
    .get()
    .then(function (response) {
        console.log(response.data);
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



# get(refresh = false) -> Promise

Sends a request with all settings and returns a Promise that resolves with the response.

* *boolean* `refresh` *(optional)*: When `true`, bypasses any cached data and forces a fresh request to the server. The new result is stored back into the cache. Defaults to `false`.

**Behavior with caching enabled** (`setCacheTTL` > 0):

| Cache state | `refresh = false` (default) | `refresh = true` |
|---|---|---|
| **Cache miss** (no data) | Fetches from server, stores in cache, resolves with `meta.refresh: false` | Same as cache miss |
| **Cache hit** (within TTL) | Returns cached data immediately, no server request. `meta.onGrace: false` | Ignores cached data, fetches from server, updates cache. `meta.refresh: true` |
| **On grace** (past TTL, within grace period) | Returns stale cached data immediately with `meta.onGrace: true`, triggers background refresh | Ignores cached data, fetches from server, updates cache. `meta.refresh: true` |

**Without caching** (no `setCacheTTL` or TTL = 0): Always fetches from the server. Response has no `meta` object.


__Example: default get__

```javascript
new SimpleVertecQuery()
    .findById(123)
    .addFields('name', 'kuerzel')
    .get()
    .then(function(response) {
        console.log(response.data);
    });
```

__Example: force refresh__

```javascript
query.get(true).then(function(response) {
    // response.meta.refresh === true
    // fresh data from server, cache updated
    console.log(response.data);
});
```

__Example: handling grace period responses__

```javascript
query.get().then(function(response) {
    if (response.meta && response.meta.onGrace) {
        // Data is stale but usable. Cache is being refreshed in the background.
        // Call get() again later to receive the updated data.
    }
    console.log(response.data);
});
```
