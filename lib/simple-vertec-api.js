import _ from 'lodash';
import SimpleXmlConverter from 'simple-xml-converter';
import ParamsInjector from 'simple-parameter-injector';
import xmlDigester from 'xml-digester';
import q from 'bluebird';
import md5 from 'md5';
import traverse from 'traverse';

let xmlDigesterLogger = xmlDigester._logger;
xmlDigesterLogger.level(xmlDigesterLogger.WARN_LEVEL);

/**
 * Credentials should be out of export scope
 */
let vertecUrl;
let vertecUsername;
let vertecPassword;

/**
 * Simple Vertec Api
 *
 * @param {string} url Your Vertec host url
 * @param {string} username Your Vertec username
 * @param {string} password Your Vertec password
 * @param {boolean} verbose set true for some debugging data
 * @param {object|null} defaultRequestOptions Default options for request
 *
 * @return {object} SimpleVertecApi
 */
export class SimpleVertecApi {
    constructor(url, username, password, verbose, defaultRequestOptions) { // eslint-disable-line max-params
        vertecUrl = url;
        vertecUsername = username;
        vertecPassword = password;
        this.verbose = verbose;
        this.defaultRequestOptions = defaultRequestOptions || {};

        this.request = require('requestretry');
        this.storedPromises = {};

        // start own garbage collector for stored promises
        setInterval(this.gcPromises, 100000);
    }

    /**
     * Custom garbage collector for stored but not pending promises anymore
     *
     * @private
     *
     * @return {void}
     */
    gcPromises() {
        _.each(this.storedPromises, (promise, hash) => {
            if (!promise.isPending()) {
                delete this.storedPromises[hash];
            }
        });
    }

    /**
     * Request retry strategy which analyses response
     * and determines wether a retry attempt should be mode or not
     *
     * @private
     *
     * @param {null|object} err Error object
     * @param {object} response Response object
     *
     * @return {boolean} Boolean determining wether a retry attempt should be made or not
     */
    requestRetryStrategy(err, response) {
        let check = (err !== null) || !_.isObject(response) || (response.statusCode >= 400) || (_.isString(response.body) && (/<html>/i.test(response.body) || /<fault>/i.test(response.body)));

        if (check) {
            this.log(err, response);
        }

        return check;
    }

    /**
     * Select for fetching data
     *
     * Forwards parameter to the select build method
     *
     * Example: take a look at the README file
     *
     * @return {Promise} Promise for the request
     */
    select() {
        let selectObject = this.buildSelectObject(...arguments);
        let xmlString = this.buildXml(selectObject);

        return this.doStoredRequest(xmlString);
    }

    /**
     * Multi Select for fetching data
     *
     * Example: take a look at the README file
     *
     * @param {array} queryArray An array of select() usable arguments
     *
     * @return {Promise} Promise for the request
     */
    multiSelect(queryArray) {
        if (!_.isArray(queryArray)) {
            throw new Error('[1453380632] no valid query array given');
        }

        return q.map(queryArray, query => this.select(...query));
    }

    /**
     * Finds one or many ids
     *
     * First parameter is for one or multiple integer ids
     * If only 2 params given then the second param is the fields array
     * If 3 params given then the second param is the params array
     * and the third param is the fields array
     *
     * @return {Promise} Promise for the request
     */
    findById() {
        arguments[0] = {
            objref: arguments[0]
        };

        return this.select(...arguments);
    }

    /**
     * Finds many ids doing parallel requests
     *
     * If only 2 params given then the second param is the fields array
     * If 3 params given then the second param is the params array
     * and the third param is the fields array
     *
     * @param {number[]} ids An array of ids
     *
     * @return {Promise} Promise for the result of all requests
     */
    multiFindById(ids, ...args) {
        return q.map(ids, id => this.select({objref: id}, ...args));
    }

    /**
     * Deletes one or many ids
     *
     * @param {number|number[]} ids One id or an array of ids
     *
     * @return {Promise} Promise for the request
     */
    delete(ids) {
        if (!_.isArray(ids)) {
            ids = [ids];
        }

        let deleteObject = this.buildDeleteBody(ids);
        let xmlString = this.buildXml(deleteObject);

        return this.doStoredRequest(xmlString);
    }

    /**
     * Saves (creates or updates) one or many new objects
     *
     * @return {Promise} Promise for the request
     */
    save() {
        let targetObjects = [];

        if (arguments.length === 1 && _.isArray(arguments[0])) {
            targetObjects = arguments[0];
        }

        if (arguments.length === 2) {
            targetObjects.push({
                className: arguments[0],
                data:      arguments[1]
            });
        }

        if (targetObjects.length === 0) {
            throw new Error('[1439115447] No valid object data found');
        }

        let createObjects = {};
        let updateObjects = {};
        _.each(targetObjects, (targetObject) => {
            if (!_.isString(targetObject.className) || !_.isPlainObject(targetObject.data)) {
                throw new Error('[1439114369] No valid create object data found');
            }

            let tempObject = {};
            tempObject[targetObject.className] = [targetObject.data];

            if (targetObject.data.objref) {
                _.extend(updateObjects, tempObject);
            } else {
                _.extend(createObjects, tempObject);
            }
        });

        let saveObject = this.buildSaveBody(createObjects, updateObjects);
        let xmlString = this.buildXml(saveObject);

        return this.doStoredRequest(xmlString);
    }

    /**
     * Builds select object for fetching data
     *
     * First parameter is query
     * If only 2 params given then the second param is the fields array
     * If 3 params given then the second param is the params array
     * and the third param is the fields array
     *
     * @private
     *
     * @return {Object} Object for the select xml building
     */
    buildSelectObject() {
        let query = arguments[0];
        let params = arguments.length === 3 ? arguments[1] : null;
        let fields = arguments.length === 3 ? arguments[2] : arguments[1];

        if (_.isUndefined(query) || ((!_.isString(query) && !_.isPlainObject(query)))) {
            throw new Error('[1438428337] no valid query given');
        }

        if (!_.isPlainObject(query)) {
            query = {
                ocl: query
            };
        }

        if (!_.isUndefined(fields) && !_.isArray(fields)) {
            throw new Error('[1449929652] no valid fields argument');
        }

        query = ParamsInjector.inject(query, params);

        if (_.isPlainObject(params)) {
            fields = ParamsInjector.inject(fields, params);
        }

        fields = this.convertFieldOptions(fields);

        return this.buildSelectBody(query, fields);
    }

    /**
     * Converts fields to proper XML ready format
     *
     * @private
     *
     * @param {array} fields Array of field definitions
     *
     * @return {array} Array of XML conversion ready fields
     */
    convertFieldOptions(fields) {
        let fieldOptions = {
            member:     [],
            expression: []
        };

        _.forEach(fields, (field) => {
            if (_.isString(field)) {
                return fieldOptions.member.push(field);
            }

            if (_.isObject(field)) {
                return fieldOptions.expression.push(field);
            }

            throw new Error('[1437849815] Unknown field type');
        });

        return fieldOptions;
    }

    /**
     * Builds the xml request string out of the body object
     *
     * @private
     *
     * @param {object} bodyObject The body object
     *
     * @return {string} Built XML String
     */
    buildXml(bodyObject) {
        let contentObject = {
            Envelope: {
                Header: {},
                Body:   {}
            }
        };

        _.extend(contentObject.Envelope.Header, this.buildXmlHeader());
        _.extend(contentObject.Envelope.Body, bodyObject);

        let xmlString = SimpleXmlConverter.toXml(contentObject, 4);
        this.log(contentObject, xmlString);

        return xmlString;
    }

    /**
     * Builds the auth part of the XML Request
     *
     * @private
     *
     * @return {object} Auth part of the XML request
     */
    buildXmlHeader() {
        return {
            BasicAuth: {
                Name:     vertecUsername,
                Password: vertecPassword
            }
        };
    }

    /**
     * Builds the select request object out of ocl expression data
     *
     * @private
     *
     * @param {string|object} select The select expression
     * @param {array} fields The fields to be fetched
     *
     * @return {object} Select object
     */
    buildSelectBody(select, fields) {
        return {
            Query: {
                Selection: select,
                Resultdef: fields
            }
        };
    }

    /**
     * Builds the body part of the XML Request containing the delete cmds
     *
     * @private
     *
     * @param {array} ids Ids which should be deleted
     *
     * @return {object} Body part of the XML request
     */
    buildDeleteBody(ids) {
        return {
            Delete: {
                objref: ids
            }
        };
    }

    /**
     * Builds the body part of the XML Request containing the create cmds
     *
     * @private
     *
     * @param {array} createObjects An array of objects to create
     * @param {array} updateObjects An array of objects to update
     *
     * @return {object} Body part of the XML request
     */
    buildSaveBody(createObjects, updateObjects) {
        return {
            Create: createObjects,
            Update: updateObjects
        };
    }

    /**
     * Temporarily store request and return if still pending
     * thus avoiding multiple identical requests going to the server
     *
     * @private
     *
     * @param {string} xmlString The XML request string
     *
     * @return {Promise} Promise for the request
     */
    doStoredRequest(xmlString) {
        let hash = md5(xmlString);

        if (this.storedPromises[hash] && this.storedPromises[hash].isPending()) {
            return this.storedPromises[hash];
        }

        let promise = this.storedPromises[hash] = this.doRequest(xmlString);

        return promise;
    }

    /**
     * Does the actual request
     *
     * @private
     *
     * @param {string} xmlString The XML request string
     *
     * @return {Promise} Promise for the request
     */
    doRequest(xmlString) {
        let requestOptions = _.extend({
            uri: vertecUrl,
            method: 'POST',
            headers: {
                'Content-Type': 'application/xml'
            },
            body: xmlString,
            maxAttempts: 5,
            retryDelay: 100,
            retryStrategy: this.requestRetryStrategy.bind(this)
        }, this.defaultRequestOptions);

        return new q((resolve, reject) => {
            this.request(requestOptions, (err, response, xmlContent) => {
                if (err) {
                    this.log('request error', err);
                    return reject(err);
                }

                this.log('raw xml content', xmlContent);

                if (xmlContent.match(/<html>/i)) {
                    this.log('request error', xmlContent);
                    let errorMessage = {
                        Error: {
                            faultstring: xmlContent.replace(/<[^>]*>?/gm, '').trim()
                        }
                    };
                    return reject(errorMessage);
                }

                let digester = xmlDigester.XmlDigester({});
                digester.digest(xmlContent, (err, jsonContent) => {
                    if (err) {
                        this.log('convert error', err);
                        return reject(err);
                    }

                    this.log('raw json content', jsonContent);

                    if (xmlContent.match(/<fault>/i)) {
                        this.log('request fault', xmlContent);
                        return reject(jsonContent.Envelope.Body);
                    }

                    let firstKey = _.keys(jsonContent.Envelope.Body)[0];
                    let response = jsonContent.Envelope.Body[firstKey];

                    this.transformDotKeys(response);

                    return resolve(response);
                });
            });
        });
    }

    /**
     * Traverses an object and splits
     *
     * @private
     *
     * @param {object} obj The target object
     *
     * @return {void}
     */
    transformDotKeys(obj) {
        traverse(obj).forEach(function(node) {
            if (this.key && _.size(this.key.match(/\./g)) > 0) {
                let newPath = this.key.split('.');
                let combinedPath = _.slice(this.path, 0, -1).concat(newPath);
                traverse(obj).set(combinedPath, node);
                this.remove();
            }
        });
    }

    /**
     * Custom log method
     *
     * @private
     *
     * @return {void}
     */
    log() {
        if (this.verbose === true) {
            let content;
            for (let i = 0; i < arguments.length; i++) {
                content = !_.isString(arguments[i]) ? JSON.stringify(arguments[i], null, 4) : arguments[i];
                content = _.isString(content) ? content.replace(vertecPassword, 'xxxxxxxxxx') : content;

                console.log(content); // eslint-disable-line no-console
            }
        }
    }
}
