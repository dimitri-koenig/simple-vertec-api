# Simple Vertec Api

A wrapper around the [Vertec](https://www.vertec.com) XML webservice for Node.js with built-in query builder, caching, retry logic, concurrency control, and response transformation.

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Setup](#setup)
- [Query Builder](#query-builder-simplevertecquery)
  - [Building Queries](#building-queries) — findById, whereOcl, whereSql, orderBy
  - [Parameters](#parameters) — addParam, addParams
  - [Fields](#fields) — addField, addFields
  - [Caching](#caching) — setCacheTTL, setCacheGraceTime, setCacheKey, setCacheName
  - [Transformation](#transformation) — addTransformer, filterProperty, setRootKey, zip
  - [Execution](#execution) — get, usingSlowLane
- [Behavior](#behavior)
  - [Dot-key Transformation](#dot-key-transformation)
  - [Retry Behavior](#retry-behavior)
  - [Request Deduplication](#request-deduplication)
  - [Slow Lane](#slow-lane)
- [Raw API](#raw-api-simplevertecapi)
  - [select()](#selectselect-params-fields---promise)
  - [multiSelect()](#multiselectqueryarray---promise)
  - [findById()](#findbyidid-params-fields---promise)
  - [multiFindById()](#multifindbyidids-args---promise)
  - [delete()](#deleteid---promise)
  - [save()](#saveobjectsarray-classname-data---promise)
- [Examples](#examples)
- [Versioning](#versioning)
- [Contributing](#contributing)
- [License](#license)


## Requirements

- Node.js >= 20
- ESM only (uses `"type": "module"` — no CommonJS support)


## Installation

```
npm install simple-vertec-api
```


## Quick Start

```javascript
import { SimpleVertecApi, SimpleVertecQuery } from 'simple-vertec-api';

// Setup once
const api = new SimpleVertecApi('https://vertec.example.com/xml', 'my-api-key');
SimpleVertecQuery.setApi(api);

// Fetch all active team members
const response = await new SimpleVertecQuery()
    .whereOcl('Projektbearbeiter')
    .whereSql('aktiv = 1')
    .orderBy('name')
    .addFields('name', 'kuerzel')
    .get();

console.log(response.data);
```

Version 5 uses Vertec's API key based authorization and a generic caching API (e.g. `@momsfriendlydevco/cache`).


## Setup

### Creating the API instance

```javascript
import { SimpleVertecApi, SimpleVertecQuery } from 'simple-vertec-api';

const api = new SimpleVertecApi('https://vertec.example.com/xml', 'my-api-key', false, {
    timeout: 120_000,
    maxAttempts: 3,
    retryDelay: 2000,
    maxConcurrentRequests: 10,
    maxConcurrentSlowLaneRequests: 5,
});
SimpleVertecQuery.setApi(api);
```

* `xmlUrl`: URL to your Vertec server XML endpoint
* `apiKey`: Your Vertec API key
* `verbose` *(optional)*: Enables additional log output (default: `false`)
* `options` *(optional)*: Override default request options
    * `timeout`: Request timeout in milliseconds (default: `10000`)
    * `maxAttempts`: Maximum retry attempts (default: `5`)
    * `retryDelay`: Delay between retries in milliseconds (default: `2000`)
    * `fixedSessionTag`: When set to a number, the `VertecSessionTag` header uses this fixed value instead of rotating
    * `maxConcurrentRequests`: Max concurrent requests in the default pool (default: `10`)
    * `maxConcurrentSlowLaneRequests`: Max concurrent requests in the [slow lane](#slow-lane) pool (default: `10`)

### Enabling caching

```javascript
import Cache from '@momsfriendlydevco/cache';

const cache = new Cache({ /* your cache config */ });
await cache.init();

SimpleVertecQuery.setCache(cache);
SimpleVertecQuery.setAppCacheKey('my-app-v1');
```

Accepts any cache with `get(key)` and `set(key, value, ttl)` methods returning Promises (where `ttl` is in milliseconds).

Cache keys are generated as `{appCacheKey}-{cacheName}-{cacheKey|md5(xml)}-{cacheTTL}`, with empty segments omitted.

### Cleanup

Call `destroy()` on the API instance to prevent memory leaks in long-running processes:

```javascript
api.destroy();
```


---


## Query Builder: SimpleVertecQuery

All chainable methods return `this`. Call `.get()` at the end to execute.

### new SimpleVertecQuery([overwriteOptions])

Pre-configure any query option at construction time:

* `query`: Object — selection (e.g. `{ ocl: '...' }` or `{ objref: 123 }`)
* `params`: Array or Object — parameters for injection
* `fields`: Array — fields to return
* `cacheKey`, `cacheName`, `cacheTTL`, `cacheGraceTime` — caching options
* `transformer`: Array — transformer functions
* `propertyFilter`: Object — `{ key, toArray }` for property extraction
* `rootKey`: String — root key for response wrapping (default: `'data'`)
* `slowLane`: Boolean — route through slow lane pool (default: `false`)

```javascript
const response = await new SimpleVertecQuery({
    query: { ocl: 'Projektbearbeiter', sqlwhere: 'aktiv = 1' },
    fields: [
        'name',
        {
            ocl: 'kuerzel',
            alias: 'token'
        },
        {
            ocl: 'aktiv',
            alias: 'isActive'
        },
    ],
    cacheTTL: 3600,
}).get();

console.log(response.data);
```


### Building Queries

#### findById(id) -> SimpleVertecQuery

```javascript
// Fetch a single project by ID with nested phase data
const response = await new SimpleVertecQuery()
    .findById(18294)
    .addFields(
        'code',
        {
            ocl: 'beschrieb',
            alias: 'description'
        },
        {
            ocl: 'phasen.boldid->listToString("===")',
            alias: 'phases.objid'
        },
        {
            ocl: 'phasen.code->listToString("===")',
            alias: 'phases.code'
        },
    )
    .filterProperty('Projekt')
    .zip('phases', 'objid')
    .get();

console.log(response.data);
```

#### whereOcl(ocl) -> SimpleVertecQuery

Sets the OCL expression for the select.

```javascript
// Fetch all active currencies
const response = await new SimpleVertecQuery()
    .whereOcl('Waehrung.allInstances->select(aktiv)')
    .addFields(
        {
            ocl: 'bezeichnung.asString',
            alias: 'code'
        },
        {
            ocl: 'kurs',
            alias: 'exchangeRate'
        },
    )
    .filterProperty('Waehrung', true)
    .get();

console.log(response.data); // [{ code: 'EUR', exchangeRate: 1.08 }, ...]
```

#### whereSql(sql) -> SimpleVertecQuery

Adds a SQL where clause.

```javascript
// Fetch active absence types ordered by code
const response = await new SimpleVertecQuery()
    .whereOcl('AbwesenheitsTyp')
    .whereSql('aktiv = 1')
    .orderBy('code')
    .addFields(
        'code',
        'priority',
        {
            ocl: 'art',
            alias: 'type'
        },
    )
    .filterProperty('AbwesenheitsTyp', true)
    .get();

console.log(response.data); // [{ code: 'Ferien', priority: 1, type: 'vacation' }, ...]
```

#### orderBy(order) -> SimpleVertecQuery

Sets the order expression.

```javascript
const response = await new SimpleVertecQuery()
    .whereOcl('Projektbearbeiter')
    .whereSql('aktiv = 1')
    .orderBy('name')
    .addFields(
        'name',
        {
            ocl: 'kuerzel',
            alias: 'token'
        },
    )
    .get();
```


### Parameters

#### addParam(value) -> SimpleVertecQuery

Adds a single parameter object. Use `:key` placeholders in OCL expressions and field aliases.

```javascript
// Fetch time entries for a project within a date range
const response = await new SimpleVertecQuery()
    .findById(18294)
    .addParam({
        startDate: '01.01.2025',
        endDate: '31.03.2025',
    })
    .addFields(
        'code',
        {
            ocl: "verpiLeistungen->select((datum >= encodeDate(:startDate)) and (datum <= encodeDate(:endDate)))->sum(minutenInt)",
            alias: 'totalMinutesInternal',
        },
        {
            ocl: "verpiLeistungen->select((datum >= encodeDate(:startDate)) and (datum <= encodeDate(:endDate)))->sum(minutenExt)",
            alias: 'totalMinutesExternal',
        },
    )
    .filterProperty('Projekt')
    .get();

console.log(response.data);
// { code: 'PRJ-2025', totalMinutesInternal: 4800, totalMinutesExternal: 4200 }
```

#### addParams(...values) -> SimpleVertecQuery

Adds multiple positional `?` parameters.

```javascript
// Search time entries by text and date
const response = await new SimpleVertecQuery()
    .whereOcl('Leistung')
    .whereSql("(text like '%?%') and (datum >= {ts '? 00:00:00'})")
    .addParams('migration', '2025-01-01')
    .addFields('datum', 'text', 'minutenInt', 'minutenExt')
    .get();
```


### Fields

#### addField(value, [alias]) -> SimpleVertecQuery

Adds a single field. Accepts a string, an object with `ocl`/`alias`, or a string + alias argument.

```javascript
// Use string + alias shorthand for OCL expressions
const response = await new SimpleVertecQuery()
    .whereOcl('Projekt')
    .addField('code')
    .addField('beschrieb', 'description')
    .addField({
        ocl: 'projektleiter.name',
        alias: 'projectLead'
    })
    .get();
```

#### addFields(values...) -> SimpleVertecQuery

Adds multiple fields. Accepts an array or variadic arguments.

```javascript
// Fetch project details with aliased fields
const response = await new SimpleVertecQuery()
    .findById(18294)
    .addFields(
        'code',
        {
            ocl: 'beschrieb',
            alias: 'description'
        },
        {
            ocl: 'projektleiter.name',
            alias: 'lead.name'
        },
        {
            ocl: 'projektleiter.kuerzel',
            alias: 'lead.token'
        },
        {
            ocl: 'aktiv',
            alias: 'isActive'
        },
        {
            ocl: 'organisationseinheit.bezeichnung',
            alias: 'unit'
        },
    )
    .filterProperty('Projekt')
    .get();

console.log(response.data);
// { code: 'PRJ-2025', description: '...', lead: { name: 'John Doe', token: 'JDO' }, ... }
```


### Caching

#### setCacheTTL(seconds) -> SimpleVertecQuery

Enables caching with the given TTL in seconds. If no `cacheKey` is set, an md5 hash of the request XML is used.

```javascript
// Cache active team members for 24 hours
const response = await new SimpleVertecQuery()
    .whereOcl('Projektbearbeiter')
    .whereSql('aktiv = 1')
    .addFields(
        'name',
        {
            ocl: 'kuerzel',
            alias: 'token'
        },
    )
    .setCacheTTL(60 * 60 * 24)
    .get();
```

#### setCacheGraceTime(seconds) -> SimpleVertecQuery

Adds a grace period implementing **stale-while-revalidate**: expired items within the grace window return stale data immediately while refreshing in the background.

When caching is enabled, responses include a `meta` object:

* `meta.cacheDateTime`: Unix timestamp when cached
* `meta.softExpire`: Unix timestamp when TTL expires (grace begins)
* `meta.onGrace`: `true` if stale data returned, background refresh in progress
* `meta.refresh`: `true` if explicitly refreshed via `get(true)`

```javascript
// Cache absence types for 24h, serve stale for up to 365 days while refreshing
const response = await new SimpleVertecQuery()
    .whereOcl('AbwesenheitsTyp')
    .whereSql('aktiv = 1')
    .orderBy('code')
    .addFields(
        'code',
        'priority',
        {
            ocl: 'art',
            alias: 'type'
        },
    )
    .setCacheTTL(60 * 60 * 24)
    .setCacheGraceTime(60 * 60 * 24 * 365)
    .setCacheName('absenceTypes')
    .filterProperty('AbwesenheitsTyp', true)
    .get();

if (response.meta.onGrace) {
    // stale but usable, cache refreshing in background
}
console.log(response.data);
```

#### setCacheKey(value) -> SimpleVertecQuery

Sets a custom cache key. Useful when query parameters change but the result is semantically the same.

```javascript
// Cache project data with a stable key (ignores changing date params in the hash)
const response = await new SimpleVertecQuery()
    .findById(18294)
    .addParam({ today: '15.01.2025' })
    .addFields(
        'code',
        {
            ocl: 'beschrieb',
            alias: 'description'
        },
    )
    .setCacheTTL(60 * 60 * 22)
    .setCacheGraceTime(60 * 60 * 24 * 28)
    .setCacheKey('project-data-v1-18294')
    .filterProperty('Projekt')
    .get();
```

#### setCacheName(value) -> SimpleVertecQuery

Sets a cache name segment for grouping related entries in the cache key.

```javascript
// Cache key becomes: my-app-v1-invoicerun-18294-{md5}-72000
const response = await new SimpleVertecQuery()
    .findById(18294)
    .addFields(/* ... */)
    .setCacheTTL(60 * 60 * 20)
    .setCacheGraceTime(60 * 60 * 24 * 28)
    .setCacheName('invoicerun-18294')
    .get();
```


### Transformation

#### addTransformer(transformer) -> SimpleVertecQuery

Adds a transformer function called after the response. Multiple transformers are chained — each receives the output of the previous one.

```javascript
// Chain transformers to normalize and enrich response data
const response = await new SimpleVertecQuery()
    .findById(18294)
    .addFields(
        'code',
        {
            ocl: 'phasen.boldid->listToString("===")',
            alias: 'phases.objid'
        },
        {
            ocl: 'phasen.code->listToString("===")',
            alias: 'phases.code'
        },
        {
            ocl: 'phasen.aktiv->listToString("===")',
            alias: 'phases.isActive'
        },
    )
    .filterProperty('Projekt')
    .zip('phases', 'objid')
    .addTransformer(data => {
        // Convert string booleans and compute derived fields
        if (data?.phases) {
            data.phases = data.phases
                .map(phase => ({ ...phase, isActive: phase.isActive === '1' }))
                .filter(phase => phase.isActive);
        }
        return data;
    })
    .get();

console.log(response.data.phases);
// [{ objid: 101, code: 'Phase 1', isActive: true }, ...]
```

#### filterProperty(key, toArray = false) -> SimpleVertecQuery

Extracts a specific Vertec class from the result. Set `toArray` to `true` when expecting multiple records.

* `key`: Vertec class name to extract (e.g. `'Projekt'`, `'Projektbearbeiter'`)
* `toArray`: Ensures the result is always an array

```javascript
// Extract the single project record
const response = await new SimpleVertecQuery()
    .findById(18294)
    .addFields(
        'code',
        {
            ocl: 'beschrieb',
            alias: 'description'
        },
    )
    .filterProperty('Projekt')
    .get();

// Extract multiple absence type records as array
const absences = await new SimpleVertecQuery()
    .whereOcl('AbwesenheitsTyp')
    .whereSql('aktiv = 1')
    .addFields('code')
    .filterProperty('AbwesenheitsTyp', true)
    .get();
```

#### setRootKey(newKey) -> SimpleVertecQuery

Sets the root key for the response data wrapper (default: `'data'`).

```javascript
const response = await new SimpleVertecQuery()
    .whereOcl('Projektbearbeiter')
    .whereSql('aktiv = 1')
    .addFields(
        'name',
        {
            ocl: 'kuerzel',
            alias: 'token'
        },
    )
    .setRootKey('users')
    .get();

console.log(response.users);
```

#### zip(path, keyToCheck = null, forceArray = true) -> SimpleVertecQuery

Zips together properties at the given path. Vertec returns list expressions as separate delimited strings — `zip()` recombines them into objects. Wildcards (`*`) are supported for nested paths.

* `path`: Path to the object property
* `keyToCheck`: Key to validate objects against
* `forceArray`: Forces the path value into an array

```javascript
// Vertec returns phases as separate delimited strings:
//   phases.objid = "101===102===103"
//   phases.code  = "Phase 1===Phase 2===Phase 3"
//
// zip('phases', 'objid') recombines them into:
//   phases = [{ objid: 101, code: 'Phase 1' }, { objid: 102, code: 'Phase 2' }, ...]

const response = await new SimpleVertecQuery()
    .findById(18294)
    .addFields(
        {
            ocl: 'phasen.boldid->listToString("===")',
            alias: 'phases.objid'
        },
        {
            ocl: 'phasen.code->listToString("===")',
            alias: 'phases.code'
        },
    )
    .filterProperty('Projekt')
    .zip('phases', 'objid')
    .get();

// Wildcard zip for nested structures
const response2 = await new SimpleVertecQuery()
    .findById(userId)
    .addFields(/* week-based resource planning fields */)
    .filterProperty('Projektbearbeiter')
    .zip('weeks.*.projects', 'objid')
    .get();
```


### Execution

#### get(refresh = false) -> Promise

Executes the query.

* `refresh` *(optional)*: When `true`, bypasses cache and forces a fresh request.

**Caching behavior** (when `setCacheTTL` > 0):

| Cache state | `refresh = false` (default) | `refresh = true` |
|---|---|---|
| **Miss** | Fetches from server, caches result | Same |
| **Hit** (within TTL) | Returns cached data | Ignores cache, fetches fresh |
| **On grace** (past TTL, within grace) | Returns stale data, refreshes in background | Ignores cache, fetches fresh |

Without caching: always fetches from the server, no `meta` in response.

```javascript
// Default — uses cache if available
const response = await query.get();
console.log(response.data);
console.log(response.meta.cacheDateTime); // when data was cached

// Force refresh — bypass cache, fetch fresh from server
const fresh = await query.get(true);
// fresh.meta.refresh === true
```

#### usingSlowLane(slowLane = true) -> SimpleVertecQuery

Routes this query through the [slow lane](#slow-lane) pool. Use for heavy queries that shouldn't block quick lookups.

```javascript
// Heavy project export — runs in the slow lane pool
const response = await new SimpleVertecQuery()
    .findById(18294)
    .addParam({
        startDate: '01.01.2025',
        endDate: '31.03.2025',
    })
    .addFields(
        'code',
        {
            ocl: 'beschrieb',
            alias: 'description'
        },
        {
            ocl: 'phasen.boldid->listToString("===")',
            alias: 'phases.objid'
        },
        {
            ocl: 'phasen.code->listToString("===")',
            alias: 'phases.code'
        },
    )
    .setCacheTTL(60 * 60 * 20)
    .setCacheGraceTime(60 * 60 * 24 * 28)
    .setCacheName('projectDetails-18294')
    .filterProperty('Projekt')
    .zip('phases', 'objid')
    .usingSlowLane()
    .get();
```


---


## Behavior

### Dot-key transformation

When field aliases contain dots (e.g. `alias: 'lead.name'`), responses are automatically transformed into nested objects.

```javascript
const response = await new SimpleVertecQuery()
    .findById(18294)
    .addFields(
        'code',
        {
            ocl: 'projektleiter.name',
            alias: 'lead.name'
        },
        {
            ocl: 'projektleiter.kuerzel',
            alias: 'lead.token'
        },
    )
    .filterProperty('Projekt')
    .get();

// response.data = { code: 'PRJ-2025', lead: { name: 'John Doe', token: 'JDO' } }
```


### Retry behavior

Failed requests are automatically retried with linear backoff (`retryCount * retryDelay`). Each retry gets a fresh timeout window.

| Condition | Retried? |
|---|---|
| No response (network error, timeout) | Yes |
| Response is not an object | Yes |
| Response has no data | Yes |
| HTTP 5xx (server errors) | Yes |
| HTTP 408 (Request Timeout) | Yes |
| HTTP 429 (Too Many Requests) | Yes |
| HTTP 400 without "token" in body | Yes |
| Response body contains `<html>`, `<fault>`, or "Internal Server Error" | Yes |
| HTTP 400 with "token" in body | No |
| HTTP 401, 403, 404 (client errors) | No |
| Other 4xx client errors | No |


### Request deduplication

Identical simultaneous requests are deduplicated — only one actual HTTP request is made and the result is shared across all callers.


### Slow lane

A separate concurrency pool for heavy or deprioritized requests, keeping them from blocking the default queue.

* **Default pool**: up to `maxConcurrentRequests` (default: `10`) concurrent requests
* **Slow lane pool**: up to `maxConcurrentSlowLaneRequests` (default: `10`) concurrent requests

Route queries via `.usingSlowLane()` on the query builder, or `{ slowLane: true }` as the last argument to `api.select()`.


---


## Raw API: SimpleVertecApi

The query builder uses `SimpleVertecApi` under the hood. You can also use it directly for CRUD operations or when you need more control.

### select(select, [params], fields) -> Promise

Queries the server. Supports OCL strings, SQL-style objects, and objref lookups.

* `select`: An OCL string, an object with `ocl`/`sqlwhere`/`sqlorder` fields, or an object with `objref` (number or array)
* `params` *(optional)*: An array for positional `?` placeholders, an object for named `:key` placeholders, or a single string/number for one `?`
* `fields` *(optional)*: Array of field names (strings) or objects with `ocl` and `alias`

**OCL string**

```javascript
const response = await api.select(
    'projektbearbeiter->select(aktiv)->orderby(name)',
    [
        'name',
        {
            alias: 'email',
            ocl: 'briefemail'
        },
    ]
);
```

**Named parameters (`:key`)**

```javascript
const response = await api.select(
    "self.verrechneteleistungen->select((datum >= encodeDate(:startDate)) and (datum <= encodeDate(:endDate)))",
    { startDate: '2025,01,01', endDate: '2025,03,31' },
    ['minutenInt', 'minutenExt', 'datum']
);
```

**SQL-style select**

```javascript
const response = await api.select(
    {
        ocl: 'Leistung',
        sqlwhere: "(text like '%:searchText%') and (CreationDateTime >= {ts ':date 00:00:00'})",
        sqlorder: 'datum'
    },
    { searchText: 'migration', date: '2025-01-01' },
    ['minutenInt', 'minutenExt', 'datum', 'text']
);
```

**Positional parameters (`?`)**

```javascript
const response = await api.select(
    'projektbearbeiter->select(boldid = ?).offeneleistungen->orderby(datum)',
    [12345],
    ['minutenInt', 'minutenExt', 'datum']
);
// rendered: projektbearbeiter->select(boldid = 12345).offeneleistungen->orderby(datum)
```


### multiSelect(queryArray) -> Promise

Executes multiple select queries in parallel. Each item is an array of arguments passed to `select()`.

```javascript
const results = await api.multiSelect([
    ['projektbearbeiter->select(boldid = ?)', [12345], ['name', 'kuerzel']],
    [{ objref: [18294, 18295] }, ['code', 'beschrieb']]
]);
// results[0] = team member response
// results[1] = projects response
```


### findById(id, [params], fields) -> Promise

Finds objects by ID(s).

* `id`: A single number or array of numbers
* `params` *(optional)*: Placeholder parameters for fields
* `fields` *(optional)*: Fields to return

```javascript
const response = await api.findById(18294, [
    'code',
    {
        ocl: 'beschrieb',
        alias: 'description'
    },
]);
```


### multiFindById(ids, [...args]) -> Promise

Finds multiple IDs via parallel requests (one per ID).

```javascript
const results = await api.multiFindById([18294, 18295], ['code', 'beschrieb']);
// results[0] = response for project 18294
// results[1] = response for project 18295
```


### delete(id) -> Promise

Deletes records by ID(s).

* `id`: A single number or array of numbers

```javascript
await api.delete(99001);
await api.delete([99001, 99002, 99003]);
```


### save([objectsArray], [className, data]) -> Promise

Creates or updates records. If `data` contains an `objref` field, an update is performed; otherwise a create.

**Single record**

```javascript
// Create a time entry
await api.save('OffeneLeistung', {
    bearbeiter: 12345,
    projekt: 18294,
    datum: '2025-01-15',
    text: 'API integration work',
    minutenInt: 120,
    minutenExt: 90
});

// Update an existing record (objref triggers update)
await api.save('OffeneLeistung', {
    objref: 99001,
    text: 'Updated: API integration and testing'
});
```

**Multiple records**

```javascript
await api.save([
    {
        className: 'OffeneLeistung',
        data: { bearbeiter: 12345, projekt: 18294, text: 'Morning standup', minutenInt: 30 }
    },
    {
        className: 'OffeneLeistung',
        data: { bearbeiter: 12345, projekt: 18294, text: 'Code review', minutenInt: 60 }
    },
    {
        className: 'OffeneLeistung',
        data: { objref: 99001, text: 'Updated description' }
    },
]);
```


---


## Examples

There is a basic example included in the `examples/` directory:

1. Clone the repo: `git clone https://github.com/dimitri-koenig/simple-vertec-api.git`
2. `cd simple-vertec-api/examples && npm install`
3. Copy `server/config.example.js` to `server/config.js` and add your credentials
4. Run `npm start`
5. Open an example file from the `client/` directory in your browser


## Versioning

This project follows [SemVer](https://semver.org) since v2.0.0.


## Contributing

1. [Fork it!](https://github.com/dimitri-koenig/simple-vertec-api/fork)
2. Create your feature branch (`git checkout -b feature/my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin feature/my-new-feature`)
5. Create new Pull Request


## License

MIT - see [LICENSE](http://opensource.org/licenses/MIT)
