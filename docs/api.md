# new SimpleVertecApi(xmlUrl, apiKey, [verbose, defaultRequestOptions])

Returns a new SimpleVertecApi object.

* `xmlUrl`: A string containing the url the your vertec server, e.g. `https://vertec.company.com/xml`
* `apiKey`: A string with your vertec api key
* `verbose` *(optional)*: A boolean which set on true will output additional log data
* `defaultRequestOptions` *(optional)*: An object with additional request default options which can override standard options
    * `timeout`: Request timeout in milliseconds (default: `10000`)
    * `maxAttempts`: Maximum number of retry attempts (default: `5`)
    * `retryDelay`: Delay between retries in milliseconds (default: `2000`)
    * `fixedSessionTag`: When set to a number, the `VertecSessionTag` header will use this fixed value for every request instead of rotating through sessions
    * `maxConcurrentRequests`: Maximum number of concurrent requests to the Vertec server (default: `10`). Requests exceeding this limit are queued and processed as active requests complete.
    * `maxConcurrentSlowLaneRequests`: Maximum number of concurrent slow lane requests (default: `10`). Slow lane requests use a separate pool, independent of the default queue. See [Slow lane](#slow-lane) below.

# destroy() -> void

Cleans up resources held by this instance. Clears the internal garbage collection interval to prevent memory leaks in long-running processes.

__Example__

```javascript
const api = new SimpleVertecApi('https://my-vertec-domain/xml', 'my-api-key');

// ... use the api ...

// Clean up when done
api.destroy();
```


# select(select, [params], fields) -> Promise

Does a query on the server with additional parameters for the select. Returns a [Promise](https://github.com/petkaantonov/bluebird).

* `select`: A string containing the ocl expression for fetching the data, or an object with 'ocl', 'sqlwhere' and 'sqlorder' fields or an objref field with an id or an array of ids for a more advanced query
* `params` *(optional)*: An array with placeholders to be replaced in the query and fields, e.g. `select where expression = ?`, or an object with key => value so that named parameters can be used in the select, e.g. `select where expression = :id`. If you only have one parameter you can also use just one `?` and set params to that string/number.
* `fields` *(optional)*: An array containing the fields which should be returned. Accepts a string as item, or an object with the fields `ocl` and `alias` to do further expressions.


__Simple select example__

```javascript
import {SimpleVertecApi} from 'simple-vertec-api';
const api = new SimpleVertecApi('https://my-vertec-domain/xml', 'my-api-key', true);

// fetches all active users ordered by their name
const select = 'projektbearbeiter->select(aktiv)->orderby(name)';
const fields = [
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
const select = 'projektbearbeiter->select(boldid = ?).offeneleistungen->orderby(datum)';
const params = [
    12345
];
const fields = [
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
const select = 'self.verrechneteleistungen->select( (datum >= encodeDate(:startDate) and (datum <= encodeDate(:endDate)) )';
const params = [
    startDate: '2015,08,03',
    endDate: '2015,08,09'
];
const fields = [
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
const select = 'self.offeneleistungen->select(datum = encodeDate(?))';
const param = '2015-08-03';
const fields = [
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
const select = {
	ocl: 'Leistung',
	sqlwhere: "(text like '%?%') and (CreationDateTime >= {ts '? 00:00:00'})",
	sqlorder: 'datum'
};
const params = [
    'search text',
    '2015-08-05'
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

```javascript
// searches for some records starting from day X, using params object
const select = {
    ocl: 'Leistung',
    sqlwhere: "(text like '%:searchText%') and (CreationDateTime >= {ts ':date 00:00:00'})",
    sqlorder: 'datum'
};
const params = {
    searchText: 'search text',
    date: '2015-08-05'
};
const fields = [
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


# multiSelect(queryArray) -> Promise

Executes multiple select queries in parallel. Each item in the array is passed as arguments to `select()`. Returns a [Promise](https://github.com/petkaantonov/bluebird) that resolves with an array of results.

* `queryArray`: An array where each item is an array of arguments that would be passed to `select()`

__Example__

```javascript
const queries = [
    // first query: OCL with params and fields
    [
        'projektbearbeiter->select(boldid = ?)',
        [12345],
        ['name', 'kuerzel']
    ],
    // second query: find by IDs with fields
    [
        { objref: [111, 222] },
        ['name', 'datum']
    ]
];

api.multiSelect(queries).then(function(results) {
    // results[0] = response from first query
    // results[1] = response from second query
    console.log(results);
});
```


# multiFindById(ids, [...args]) -> Promise

Finds multiple IDs by making parallel requests (one request per ID). Returns a [Promise](https://github.com/petkaantonov/bluebird) that resolves with an array of results.

* `ids`: An array of IDs
* `...args`: Additional arguments passed to each individual select call (params and/or fields)

__Example__

```javascript
api.multiFindById([12345, 23456], ['name', 'kuerzel']).then(function(results) {
    // results[0] = response for ID 12345
    // results[1] = response for ID 23456
    console.log(results);
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


---

# Dot-key transformation

When field aliases contain dots (e.g., `alias: 'Person.Kontakt'`), the response is automatically transformed so that dotted keys become nested objects. This happens transparently on every response.

__Example__

```javascript
const fields = [
    { ocl: 'kontaktperson.name', alias: 'Person.Name' },
    { ocl: 'kontaktperson.email', alias: 'Person.Email' }
];

api.select('Projekt', fields).then(function(response) {
    // Without dot-key transformation, response would contain:
    // { 'Person.Name': 'John', 'Person.Email': 'john@example.com' }
    //
    // With dot-key transformation, it becomes:
    // { Person: { Name: 'John', Email: 'john@example.com' } }
    console.log(response.Person.Name);
});
```


# Retry behavior

Failed requests are automatically retried using exponential backoff via [axios-retry](https://github.com/softonic/axios-retry). The following `defaultRequestOptions` control retry behavior:

* `maxAttempts`: Maximum number of retry attempts (default: `5`)
* `retryDelay`: Base delay between retries in milliseconds (default: `2000`). Actual delay is `retryCount * retryDelay` (linear backoff).

Each retry resets the request timeout (`shouldResetTimeout: true`), so every attempt gets a fresh timeout window.

**Conditions that trigger a retry:**

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


# Request deduplication

Multiple identical & simultaneous requests will be temporarily stored and thus only one promise returned. Because every query is stateless and contains every information it needs there shouldn't be any issues even with different user data.


# Slow lane

The slow lane provides a separate concurrency pool for heavy or deprioritized requests. By default, all requests use the main pool. Heavy requests can be routed to the slow lane so they don't block the default queue.

The two pools are completely independent:

* **Default pool**: up to `maxConcurrentRequests` (default: `10`) concurrent requests
* **Slow lane pool**: up to `maxConcurrentSlowLaneRequests` (default: `10`) concurrent requests

Total possible concurrent requests = `maxConcurrentRequests` + `maxConcurrentSlowLaneRequests`.

Slow lane requests are routed via `SimpleVertecQuery.usingSlowLane()` (see [query docs](query.md#withslowlaneslowlane--true---simplevertecquery)) or by passing `{ slowLane: true }` as the last argument to `select()`.

__Example__

```javascript
const api = new SimpleVertecApi('https://my-vertec-domain/xml', 'my-api-key', false, {
    maxConcurrentRequests: 10,
    maxConcurrentSlowLaneRequests: 5
});

// Default request — uses the main pool
api.select('SmallLookup->select(aktiv)', ['name']);

// Slow lane request — uses the separate slow lane pool
api.select('HeavyExport->select(all)', ['name', 'data', 'history'], { slowLane: true });
```
