# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [unreleased][unreleased]

## [4.0.2][2019-05-24]
### Bugfix
* Requests with an invalid token will be retried instead of simply returned (#103)

## [4.0.1][2019-05-24]
### Bugfix
* Response parsing fails if Server (Vertec 6.3) simply returns "Internal Server Error" (#102)

## [4.0.0][2019-05-20]
### Feature
* Changed auth method and included usage of a token according to latest changes of Vertec >=6.2 (#100)

## [3.0.0][2016-09-13]
### Feature
* Added more zip transformer options, added forceArray option to be default
* Added multiple requests in parallel mode
* Added zip method to zip together properties of an object
* Added setRootKey method to enable setting a key other than "data"
* Added transformer feature before putting into cache (#95)
* Added feature to merge specific response properties into result, with optional array transformation (#97)
* Added query class for select operations

### Bugfix
* Fixed some more bugs with parallel mode
* Fixed bugs with parallel mode and performing param injection
* Fixed bugs with parallel mode where providing only one id in an array did not result in correct parallel response return format
* Fixed bug where zip transformation needs to be placed in correct order into transformers array
* Fixed bug with running multiple transformers which all create new return values
* Fixed wrong calculation of softExpire timestamp
* Removed empty cache item check due to missing business logic per use case
* Updated simple-parameter-injector to 1.0.1 due to a nasty bug with parameters being modified
* Cache key did not consider findById params (#98)

### Removal
* Removed Vertec request time from result object due to sideeffects (#96)

### Enhancement
* addFields accepts one array argument with fields to add
* Added Vertec request time to result object (#96)
* cacheKey includes cacheTTL just in case it should be lowered without flushing the whole cache
* Logging of build xml string only when sending request
* Added documentation for v3 query feature (#91)

## [2.21.2][2016-05-09]
### Bugfix
* Multiple create/update objects won't be saved (#90)

## [2.21.1][2016-02-05]
### Bugfix
* this.log with parameter != string produces an uncatched error resulting in a crash (#89)

## [2.21.0][2016-02-03]
### Feature
* multiFindById: Making parallel requests using findById (#88)

## [2.20.1][2016-02-03]
### Bugfix
* Multiple response objects will now be returned as array rather then merged (#87)

## [2.20.0][2016-02-03]
### Feature
* Execute multiselect requests in parallel (#85)

### Enhancements
* Updated dep packages (#86)

## [2.19.2][2016-02-02]
### Bugfix
* Forgot to compile and package new version

## [2.19.1][2016-02-01]
### Bugfix
* Fixed crash on missing response object (#84)

## [2.19.0][2016-01-29]
### Feature
* Implemented feature for splitting alias with multiple dots into an object (#83)

## [2.18.0][2016-01-21]
### Feature
* Enabled multiple query elements in one request (#81)

## [2.17.0][2016-01-15]
### Feature
* If an expression alias contains a dot it will be transformed like an object path

## [2.16.0][2015-12-24]
### Feature
* findById() now behaves like select() (#78)

## [2.15.0][2015-12-23]
### Feature
* Extended pending request storage to every request (#77)

## [2.14.1][2015-12-22]
### Bugfix
* Error logging within retryStrategy results in error due to wrong 'this' reference (#75)

## [2.14.0][2015-12-20]
### Feature
* Stores pending select query promise for mulitple identical requests (#74)

## [2.13.0][2015-12-17]
### Feature
* Added retry functionality on basic/unknown errors (#73)

## [2.12.0][2015-12-13]
### Feature
* Allow select with only a query (#72)

## [2.11.1][2015-12-07]
### Enhancement
* Interpret HTML output as error (#70)

## [2.11.0][2015-12-01]
### Enhancement
* Added more logging (#21)

### Bugfix
* Fixed digester errors (#69)

## [2.10.0][2015-10-20]
### Feature
* Enforcing raw output logging of response data strings (#64)
* Added indentation for xml building for better log outputs (#65)

### Internal
* Extracted xml converter class into separate simple-xml-converter package and replaced class (#58)
* Extracted parameter injector class into separate simple-parameter-injector package and replaced class (#58)

## [2.9.0][2015-09-24]
### Internal
* Modified ParamsInjection delimiter to some random string (#59)
* Moved sensible data out of module export scope (#62)
* Obscurified sensible data in logs (#61)

## [2.8.0][2015-09-21]
### Feature
* Params replacement also available for fields (#55)

## [2.7.0][2015-09-20]
### Internal
* Moved all XML related stuff to XmlConverter class (#49)
* Refactored XmlConverter class (#50)
* Cleanup after responsibility clarification (#54)
* Objects with empty arrays won't be included in XML (#57)
* Refactored XmlConverter Class (#50)
* Refactored Main Class (#51)

## [2.6.0][2015-09-09]
### Feature
* Added special chars handling (#47)

## [2.5.0][2015-09-08]
### Internal
* Replaced simple-xml with own object to xml converter (#43)
* Simplified object building process (#44)
* Moved babel package to dev deps (#46)

### Deprecated
* Removed inconsistent usage of date encoding (#40)

## [2.4.0][2015-08-30]
### Internal
* Optimize xml building process (#39)

## [2.3.0][2015-08-27]
### Deprecated
* Date/Moment object conversion will be removed in 2.5

## [2.2.0][2015-08-20]
### Features
* New "findById" feature (#30)

## [2.1.1][2015-08-17]
### Bugfixes
* Request errors in doRequest() wouldn't be catched (#35)

## [2.1.0][2015-08-16]
### Internal Changes
* Replaced request-promise with request (#34)

## [2.0.0][2015-08-13]
### New Features
* Added save() method for creating/updating objects (#26)
* Select query can include any possible parameters (#28)
* Created dedicated documentation (#23)

### Changed
* Modified select object parameters to enable original vertec fields (#28)
