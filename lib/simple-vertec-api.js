import _ from 'lodash';
import util from 'util';
import XmlConverter from './XmlConverter';
import ParamsInjector from './ParamsInjector';
import xmlDigester from 'xml-digester';
import q from 'bluebird';

var xmlDigesterLogger = xmlDigester._logger;
var digester = xmlDigester.XmlDigester({});
xmlDigesterLogger.level(xmlDigesterLogger.WARN_LEVEL);

/**
 * Simple Vertec Api
 *
 * @param {string} url Your Vertec host url
 * @param {string} username Your Vertec username
 * @param {string} password Your Vertec password
 * @param {boolean} verbose set true for some debugging data
 *
 * @return {object} SimpleVertecApi
 */
export class SimpleVertecApi {
    constructor(url, username, password, verbose) {
        this.url = url;
        this.username = username;
        this.password = password;
        this.verbose = verbose;
        this.request = require('request');
    }

    /**
     * Select for fetching data
     *
     * First parameter is query
     * If only 2 params given then the second param is the fields array
     * If 3 params given then the second param is the params array
     * and the third param is the fields array
     *
     * Example: take a look at the README file
     *
     * @return {Promise} Promise for the request
     */
    select() {
        var query = arguments[0];
        var params = arguments.length === 3 ? arguments[1] : null;
        var fields = arguments.length === 3 ? arguments[2] : arguments[1];

        if (arguments.length < 2) {
            throw new Error('[1438427960] no query and fields arguments given');
        }

        if (arguments.length >= 2 && ((!_.isString(query) && !_.isPlainObject(query)) || !_.isArray(fields))) {
            throw new Error('[1438428337] no valid query and fields arguments given');
        }

        if (!_.isPlainObject(query)) {
            query = {
                ocl: query
            };
        }

        query = ParamsInjector.inject(query, params);
        fields = this.convertFieldOptions(fields);

        var selectObject = this.buildSelectBody(query, fields);
        var xmlString = this.buildXml(selectObject);

        return this.doRequest(xmlString);
    }

    /**
     * Finds one or many ids
     *
     * @param {number|number[]} ids One id or an array of ids
     * @param {object} fields Fields to fetch
     *
     * @return {Promise} Promise for the request
     */
    findById(ids, fields) {
        var query = {
            objref: ids
        };

        return this.select(query, fields);
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

        var deleteObject = this.buildDeleteBody(ids);
        var xmlString = this.buildXml(deleteObject);

        return this.doRequest(xmlString);
    }

    /**
     * Saves (creates or updates) one or many new objects
     *
     * @return {Promise} Promise for the request
     */
    save() {
        var targetObjects = [];

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

        var createObjects = {};
        var updateObjects = {};
        _.each(targetObjects, (targetObject) => {
            if (!_.isString(targetObject.className) || !_.isPlainObject(targetObject.data)) {
                throw new Error('[1439114369] No valid create object data found');
            }

            var tempObject = {};
            tempObject[targetObject.className] = [targetObject.data];

            if (targetObject.data.objref) {
                _.extend(updateObjects, tempObject);
            } else {
                _.extend(createObjects, tempObject);
            }
        });

        var saveObject = this.buildSaveBody(createObjects, updateObjects);
        var xmlString = this.buildXml(saveObject);

        return this.doRequest(xmlString);
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
        var fieldOptions = {
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
        var contentObject = {
            Envelope: {
                Header: {},
                Body:   {}
            }
        };

        _.extend(contentObject.Envelope.Header, this.buildXmlHeader());
        _.extend(contentObject.Envelope.Body, bodyObject);

        var xmlString = XmlConverter.toXml(contentObject);
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
                Name:     this.username,
                Password: this.password
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
        var contentObject = {
            Query: {
                Selection: select,
                Resultdef: fields
            }
        };

        return contentObject;
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
        var content = {
            Delete: {
                objref: ids
            }
        };

        return content;
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
        var content = {
            Create: createObjects,
            Update: updateObjects
        };

        return content;
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
        var requestOptions = {
            uri:     this.url,
            method:  'POST',
            headers: {
                'Content-Type': 'application/xml'
            },
            body:    xmlString
        };

        return new q((resolve, reject) => {
            this.request(requestOptions, (err, response, xmlContent) => {
                if (err) {
                    return reject(err);
                }

                digester.digest(xmlContent, (err, jsonContent) => {
                    this.log(xmlContent, jsonContent);

                    if (xmlContent.match(/<fault>/i)) {
                        return reject(jsonContent.Envelope.Body);
                    }

                    var firstKey = _.keys(jsonContent.Envelope.Body)[0];
                    var response = jsonContent.Envelope.Body[firstKey];

                    return resolve(response);
                });
            });
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
            for (var i = 0; i < arguments.length; i++) {
                console.log(util.inspect(arguments[i], { // eslint-disable-line no-console
                    colors: true,
                    depth:  null
                }));
            }
        }
    }
}
