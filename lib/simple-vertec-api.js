import ParamsInjector from 'simple-parameter-injector';
import SimpleXmlConverter from 'simple-xml-converter';
import xmlDigester from 'xml-digester';
import axiosRetry from 'axios-retry';
import traverse from 'traverse';
import axios from 'axios';
import q from 'bluebird';
import _ from 'lodash';
import md5 from 'md5';

const isInTest = typeof global.it === 'function';

let xmlDigesterLogger = xmlDigester._logger;
xmlDigesterLogger.level(xmlDigesterLogger.WARN_LEVEL);

/**
 * Credentials should be out of export scope
 */
let vertecXmlUrl = null;
let vertecApiKey = null;
let vertecSessionForRequest = 1;
let vertecMaxSessionsForRequests = 8;
let vertecRequestCount = 0;

/**
 * Simple Vertec Api
 *
 * @param {string} xmlUrl Your Vertec host url
 * @param {string} apiKey Your Vertec api key
  * @param {boolean} verbose set true for some debugging data
 * @param {object|null} defaultRequestOptions Default options for request
 *
 * @return {object} SimpleVertecApi
 */
export default class SimpleVertecApi {
    constructor(xmlUrl, apiKey, verbose = false, defaultRequestOptions = {}) {
        vertecXmlUrl = xmlUrl;
        vertecApiKey = apiKey;

        this.verbose = verbose;
        this.defaultRequestOptions = defaultRequestOptions;

        this.storedPromises = {};

        // start own garbage collector for stored promises
        setInterval(this.gcPromises.bind(this), 15 * 1000);
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
     * Select for fetching data
     *
     * Forwards parameter to the select build method
     *
     * Example: take a look at the README file
     *
     * @return {Promise} Promise for the request
     */
    select() {
        let xmlString = this.buildSelectString(...arguments);

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
        let saveData = [];

        if (arguments.length === 1 && _.isArray(arguments[0])) {
            saveData = arguments[0];
        }

        if (arguments.length === 2) {
            saveData.push({
                className: arguments[0],
                data: arguments[1]
            });
        }

        if (saveData.length === 0) {
            throw new Error('[1439115447] No valid object data found');
        }

        let createObjects = {};
        let updateObjects = {};
        _.each(saveData, saveObject => {
            if (!_.isString(saveObject.className) || !_.isPlainObject(saveObject.data)) {
                throw new Error('[1439114369] No valid save object data found');
            }

            let targetObject = saveObject.data.objref ? updateObjects : createObjects;

            if (!targetObject[saveObject.className]) {
                targetObject[saveObject.className] = [];
            }

            targetObject[saveObject.className].push(saveObject.data);
        });

        let saveObject = this.buildSaveBody(createObjects, updateObjects);
        let xmlString = this.buildXml(saveObject);

        return this.doStoredRequest(xmlString);
    }

    /**
     * Builds an xml string for the select
     *
     * @return {string} XML String
     */
    buildSelectString() {
        let selectObject = this.buildSelectObject(...arguments);

        return this.buildXml(selectObject);
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
            member: [],
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
     * @param {object} body The body object
     *
     * @return {string} Final XML String
     */
    buildXml(body) {
        let contentObject = {
            Envelope: {
                Body: body,
            }
        };

        return this.buildXmlStringFromObject(contentObject);
    }

    /**
     * Builds an xml string from any object
     *
     * @api
     *
     * @param {object} obj Source object
     *
     * @return {string} XML string
     */
    buildXmlStringFromObject(obj) {
        return SimpleXmlConverter.toXml(obj, 4);
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

        return this.storedPromises[hash] = this.doRequest(xmlString);
    }

    /**
     * Request retry strategy which analyses response
     * and determines wether a retry attempt should be mode or not
     *
     * @private
     *
     * @param {AxiosError} error Default Axios Error object
     *
     * @return {boolean} Boolean determining wether a retry attempt should be made or not
     */
    requestRetryStrategy(error) {
        delete error?.config?.headers?.Authorization;

        if (!error.response) {
            this.error('Retry Strategy Error, No Response given', error);

            return true;
        }

        if (!_.isObject(error.response)) {
            this.error('Retry Strategy Error, No Response Object given', error);

            return true;
        }

        if (!error.response.data) {
            this.error('Retry Strategy Error, No Response Data given', error);

            return true;
        }

        if (error.response.status > 400) {
            this.error('Retry Strategy Error, Status > 400', error);

            return true;
        }

        if (error.response.status === 400 && (!_.isString(error.response.data) || (_.isString(error.response.data) && error.response.data.indexOf('token') === -1))) {
            this.error('Retry Strategy Error, Status 400 without token', error);

            return true;
        }

        if (_.isString(error.response.data) && (/<html>/i.test(error.response.data) || /<fault>/i.test(error.response.data) || /Internal Server Error/i.test(error.response.data))) {
            this.error('Retry Strategy Error, HTML, Fault or Internal Server Error', error);

            return true;
        }

        return false;
    }

    request(xmlString) {
        let headers = {
            'Content-Type': 'application/xml',
        };

        vertecSessionForRequest++;

        // start with session = 2 to avoid any conflicts of first session, which is maybe used by other processes
        if (vertecSessionForRequest > (vertecMaxSessionsForRequests + 1)) {
            vertecSessionForRequest = 2;
        }

        headers.Authorization = `Bearer ${vertecApiKey}`;
        headers.VertecSessionTag = `${vertecSessionForRequest}`;

        this.log('Vertec session: ' + vertecSessionForRequest);
        this.log('Vertec request count: ' + (vertecRequestCount++));

        const client = axios.create({
            headers,
            timeout: this.defaultRequestOptions['timeout'] || 1000 * 10,
        });

        axiosRetry(client, {
            retries: this.defaultRequestOptions['maxAttempts'] || 5,
            shouldResetTimeout: true,
            retryDelay: (retryCount) => {
                return retryCount * (this.defaultRequestOptions['retryDelay'] || 2000);
            },
            onRetry: (retryCount, error, requestConfig) => {
                this.log('retrying request for ' + xmlString + ' for the ' + retryCount + ' time due to ' + error.message);
                this.log('Vertec request count: ' + (vertecRequestCount++));
            },
            retryCondition: (error) => {
                return this.requestRetryStrategy(error);
            },
        });

        return client
            .post(vertecXmlUrl, xmlString)
            .catch(error => {
                this.error(error.message);

                // extract error message and status and throw it
                throw new Error(error.message);
            });
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
        this.log('sending request', xmlString);

        return new q((resolve, reject) => {
            this.request(xmlString)
                .then(response => {
                    let xmlContent = response.data;

                    this.log('raw xml content', xmlContent);

                    if (typeof xmlContent !== 'string') {
                        this.error('request error', xmlContent);
                        return reject(new Error('No valid response from Vertec'));
                    }

                    if (xmlContent.match(/<html>/i)) {
                        this.error('request error', xmlContent);
                        return reject(new Error(xmlContent.replace(/<[^>]*>?/gm, '').trim()));
                    }

                    if (!xmlContent.match(/[<>]+/i)) {
                        this.error('xml request error', xmlContent);
                        return reject(new Error(xmlContent.trim()));
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

                        resolve(response);
                    });
                })
                .catch(error => {
                    this.error('Error in xml request from Vertec', error, 'XML String:', xmlString);

                    reject(error);
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
        traverse(obj).forEach(function (node) {
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
        if (this.verbose !== true || isInTest) {
            return;
        }

        let content;
        for (let i = 0; i < arguments.length; i++) {
            content = !_.isString(arguments[i]) ? JSON.stringify(arguments[i], null, 4) : arguments[i];

            console.log(content);
        }
    }

    /**
     * Custom error log method
     *
     * @private
     *
     * @return {void}
     */
    error() {
        if (isInTest) {
            return;
        }

        let content;
        for (let i = 0; i < arguments.length; i++) {
            content = !_.isString(arguments[i]) ? JSON.stringify(arguments[i], null, 4) : arguments[i];

            console.error(content);
        }
    }
}
