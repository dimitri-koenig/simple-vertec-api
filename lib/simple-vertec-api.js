import ParamsInjector from './simple-parameter-injector.js';
import SimpleXmlConverter from './simple-xml-converter.js';
import { createHash } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import axiosRetry from 'axios-retry';
import axios from 'axios';
import _ from 'lodash';

const md5 = (str) => createHash('md5').update(str).digest('hex');

const xmlParser = new XMLParser({ parseTagValue: false });

const isInTest = typeof global.it === 'function';

/**
 * Global request count across all instances
 */
let vertecRequestCount = 0;

/**
 * Wraps a promise to track its pending state via an isPending() method.
 *
 * @private
 *
 * @param {Promise} promise
 *
 * @return {Promise} The same promise with isPending() attached
 */
function trackPending(promise) {
    let pending = true;
    promise.then(
        () => { pending = false; },
        () => { pending = false; }
    );
    promise.isPending = () => pending;
    return promise;
}

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
        this.xmlUrl = xmlUrl;
        this.apiKey = apiKey;
        this.sessionForRequest = 1;
        this.maxSessionsForRequests = 8;

        this.verbose = verbose;
        this.defaultRequestOptions = defaultRequestOptions;

        this.storedPromises = {};

        // concurrency limiting for Vertec API requests
        this.maxConcurrentRequests = defaultRequestOptions['maxConcurrentRequests'] || 10;
        this.activeRequests = 0;
        this.requestQueue = [];

        // slow lane: separate pool for heavy/deprioritized requests
        this.maxConcurrentSlowLaneRequests = defaultRequestOptions['maxConcurrentSlowLaneRequests'] || 10;
        this.activeSlowLaneRequests = 0;
        this.slowLaneQueue = [];

        // create reusable axios client
        this.client = axios.create({
            timeout: this.defaultRequestOptions['timeout'] || 1000 * 10,
            headers: {
                'Content-Type': 'application/xml',
                Authorization: `Bearer ${this.apiKey}`,
            },
        });

        axiosRetry(this.client, {
            retries: this.defaultRequestOptions['maxAttempts'] || 5,
            shouldResetTimeout: true,
            retryDelay: (retryCount) => {
                return retryCount * (this.defaultRequestOptions['retryDelay'] || 2000);
            },
            onRetry: (retryCount, error, requestConfig) => {
                this.log(`retrying request for ${requestConfig.data} for the ${retryCount} time due to ${error.message}`);
                this.log(`Vertec request count: ${vertecRequestCount++}`);
            },
            retryCondition: (error) => {
                return this.requestRetryStrategy(error);
            },
        });

        // start own garbage collector for stored promises
        this._gcInterval = setInterval(this.gcPromises.bind(this), 15 * 1000);
    }

    /**
     * Cleans up resources held by this instance
     *
     * Clears the garbage collection interval to prevent memory leaks.
     *
     * @return {void}
     */
    destroy() {
        if (this._gcInterval) {
            clearInterval(this._gcInterval);
            this._gcInterval = null;
        }
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
    select(...args) {
        let requestOptions = {};

        if (args.length > 0 && _.isPlainObject(args[args.length - 1]) && 'slowLane' in args[args.length - 1]) {
            requestOptions = args.pop();
        }

        let xmlString = this.buildSelectString(...args);

        return this.doStoredRequest(xmlString, requestOptions);
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

        return Promise.all(queryArray.map(query => this.select(...query)));
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
    findById(id, ...rest) {
        return this.select({ objref: id }, ...rest);
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
        return Promise.all(ids.map(id => this.select({objref: id}, ...args)));
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
    save(...args) {
        let saveData = [];

        if (args.length === 1 && _.isArray(args[0])) {
            saveData = args[0];
        }

        if (args.length === 2) {
            saveData.push({
                className: args[0],
                data: args[1]
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
     * @private
     *
     * @return {string} XML String
     */
    buildSelectString(...args) {
        let selectObject = this.buildSelectObject(...args);

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
    buildSelectObject(...args) {
        let query = args[0];
        let params = args.length === 3 ? args[1] : null;
        let fields = args.length === 3 ? args[2] : args[1];

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

        return SimpleXmlConverter.toXml(contentObject, 4);
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
    doStoredRequest(xmlString, requestOptions = {}) {
        let hash = md5(xmlString);

        if (this.storedPromises[hash] && this.storedPromises[hash].isPending()) {
            return this.storedPromises[hash];
        }

        return this.storedPromises[hash] = this.enqueueRequest(xmlString, requestOptions);
    }

    /**
     * Enqueues a request for concurrency-limited execution
     *
     * @private
     *
     * @param {string} xmlString The XML request string
     * @param {object} requestOptions Options for routing (e.g. { slowLane: true })
     *
     * @return {Promise} Promise for the request
     */
    enqueueRequest(xmlString, requestOptions = {}) {
        return trackPending(new Promise((resolve, reject) => {
            const queue = requestOptions.slowLane ? this.slowLaneQueue : this.requestQueue;
            queue.push({ xmlString, resolve, reject });
            this.processQueue();
        }));
    }

    /**
     * Processes queued requests up to the concurrency limit
     *
     * @private
     *
     * @return {void}
     */
    processQueue() {
        this._drainLane(this.requestQueue, 'activeRequests', 'maxConcurrentRequests');
        this._drainLane(this.slowLaneQueue, 'activeSlowLaneRequests', 'maxConcurrentSlowLaneRequests');
    }

    /**
     * Drains a single queue lane up to its concurrency limit
     *
     * @private
     *
     * @param {Array} queue The queue array to drain
     * @param {string} activeKey Property name tracking active count
     * @param {string} maxKey Property name for the concurrency limit
     *
     * @return {void}
     */
    _drainLane(queue, activeKey, maxKey) {
        while (queue.length > 0 && this[activeKey] < this[maxKey]) {
            const { xmlString, resolve, reject } = queue.shift();
            this[activeKey]++;

            this.doRequest(xmlString)
                .then(resolve)
                .catch(reject)
                .finally(() => {
                    this[activeKey]--;
                    this.processQueue();
                });
        }
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

        if (error.response.status >= 500) {
            this.error('Retry Strategy Error, Status >= 500', error);

            return true;
        }

        if (error.response.status === 408 || error.response.status === 429) {
            this.error(`Retry Strategy Error, Status ${error.response.status}`, error);

            return true;
        }

        if (error.response.status === 400 && (typeof error.response.data !== 'string' || !error.response.data.includes('token'))) {
            this.error('Retry Strategy Error, Status 400 without token', error);

            return true;
        }

        if (typeof error.response.data === 'string' && /<html>|<fault>|Internal Server Error/i.test(error.response.data)) {
            this.error('Retry Strategy Error, HTML, Fault or Internal Server Error', error);

            return true;
        }

        return false;
    }

    /**
     * Sends a raw XML request to the Vertec server
     *
     * @private
     *
     * @param {string} xmlString The XML request string
     *
     * @return {Promise} Promise for the axios response
     */
    request(xmlString) {
        if (this.defaultRequestOptions['fixedSessionTag'] != null) {
            this.sessionForRequest = this.defaultRequestOptions['fixedSessionTag'];
        } else {
            this.sessionForRequest++;

            // start with session = 2 to avoid any conflicts of first session, which is maybe used by other processes
            if (this.sessionForRequest > this.maxSessionsForRequests + 1) {
                this.sessionForRequest = 2;
            }
        }

        this.log(`Vertec session: ${this.sessionForRequest}`);
        this.log(`Vertec request count: ${vertecRequestCount++}`);

        return this.client
            .post(this.xmlUrl, xmlString, {
                headers: {
                    VertecSessionTag: `${this.sessionForRequest}`,
                },
            })
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
    async doRequest(xmlString) {
        this.log('sending request', xmlString);

        let response;
        try {
            response = await this.request(xmlString);
        } catch (error) {
            this.error('Error in xml request from Vertec', error, 'XML String:', xmlString);
            throw error;
        }

        let xmlContent = response.data;

        this.log('raw xml content', xmlContent);

        if (typeof xmlContent !== 'string') {
            this.error('request error', xmlContent);
            throw new Error('No valid response from Vertec');
        }

        if (xmlContent.match(/<html>/i)) {
            this.error('request error', xmlContent);
            throw new Error(xmlContent.replace(/<[^>]*>?/gm, '').trim());
        }

        if (!xmlContent.match(/[<>]+/i)) {
            this.error('xml request error', xmlContent);
            throw new Error(xmlContent.trim());
        }

        let jsonContent;
        try {
            jsonContent = xmlParser.parse(xmlContent, true);
        } catch (err) {
            this.log('convert error', err);
            throw err;
        }

        this.log('raw json content', jsonContent);

        if (xmlContent.match(/<fault>/i)) {
            this.log('request fault', xmlContent);
            throw jsonContent.Envelope.Body;
        }

        let firstKey = Object.keys(jsonContent.Envelope.Body)[0];
        let result = jsonContent.Envelope.Body[firstKey];

        this.transformDotKeys(result);

        return result;
    }

    /**
     * Traverses an object and transforms dot-separated keys into nested objects
     *
     * @private
     *
     * @param {object} obj The target object
     *
     * @return {void}
     */
    transformDotKeys(obj) {
        if (!obj || typeof obj !== 'object') return;

        if (Array.isArray(obj)) {
            obj.forEach(item => this.transformDotKeys(item));
            return;
        }

        for (const key of Object.keys(obj)) {
            if (key.includes('.')) {
                const parts = key.split('.');
                let target = obj;
                for (let i = 0; i < parts.length - 1; i++) {
                    if (!target[parts[i]] || typeof target[parts[i]] !== 'object') {
                        target[parts[i]] = {};
                    }
                    target = target[parts[i]];
                }
                target[parts[parts.length - 1]] = obj[key];
                delete obj[key];
            }
        }

        // Recurse into nested objects after processing dot keys
        for (const key of Object.keys(obj)) {
            if (obj[key] && typeof obj[key] === 'object') {
                this.transformDotKeys(obj[key]);
            }
        }
    }

    /**
     * Custom log method
     *
     * @private
     *
     * @return {void}
     */
    log(...args) {
        if (this.verbose !== true || isInTest) {
            return;
        }

        for (const arg of args) {
            const content = !_.isString(arg) ? JSON.stringify(arg, null, 4) : arg;
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
    error(...args) {
        if (isInTest) {
            return;
        }

        for (const arg of args) {
            const content = !_.isString(arg) ? JSON.stringify(arg, null, 4) : arg;
            console.error(content);
        }
    }
}
