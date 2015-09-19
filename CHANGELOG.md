# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [unreleased][unreleased]
### Internal
* Moved all XML related stuff to XmlConverter class (#49)
* Refactored XmlConverter class (#50)
* Cleanup after responsibility clarification (#54)

## [2.6.0][2015-09-09]
### Feature
* Added special chars handling (#47)

## [2.5.0][2015-09-08]
### Internal
* Replaced simple-xml with own object to xml converter (#43)
* Simplified object building process (#44)
* Moved babel package to dev deps (#46)
* Objects with empty arrays won't be included in XML (#57)

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
