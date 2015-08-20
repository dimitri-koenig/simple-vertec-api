import xmlBuilder from 'xml';
import _ from 'lodash';
import util from 'util';
import xmlDigester from 'xml-digester';
import q from 'bluebird';
import moment from 'moment';

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

        query = this.handleQueryObject(query);
        if (params !== null) {
            query = this.injectParams(query, params);
        }
        query = this.handleQueryObject(query);

        var selectObject = this.buildSelectObject(query, fields);
        var xmlString = this.buildXml(selectObject);

        return this.doRequest(xmlString);
    }

    /**
     * Finds one or many ids
     *
     * @param {mixed} ids One id or an array of ids
     *
     * @return {Promise} Promise for the request
     */
    findById(ids) {
        if (!_.isArray(ids)) {
            ids = [ids];
        }

        _.each(ids, (id) => {
            if (_.isNaN(parseInt(id))) {
                throw new Error('[1440046203] Id must be a number');
            }
        });

        var query = {
            objref: ids
        };
        var fields = arguments[1];
        return this.select(query, fields);
    }

    /**
     * Deletes one or many ids
     *
     * @param {mixed} ids One id or an array of ids
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
        var targetObject = [];

        if (arguments.length === 1 && _.isArray(arguments[0])) {
            targetObject = arguments[0];
        }

        if (arguments.length === 2) {
            targetObject.push({
                className: arguments[0],
                data:      arguments[1]
            });
        }

        if (targetObject.length === 0) {
            throw new Error('[1439115447] No valid object data found');
        }

        targetObject = this.buildSaveBody(targetObject);
        var xmlString = this.buildXml(targetObject);

        return this.doRequest(xmlString);
    }

    /**
     * Handles select being an object
     *
     * @private
     *
     * @param {mixed} select Simple ocl string or sql object
     *
     * @return {mixed} Select string or object
     */
    handleQueryObject(select) {
        var selectArray;

        if (_.isString(select) && select.indexOf('|||') !== -1) {
            selectArray = select.split('|||');

            return JSON.parse(selectArray[1]);
        }

        if (_.isPlainObject(select)) {
            return '|||' + JSON.stringify(select) + '|||';
        }

        return select;
    }

    /**
     * Injects parameters into the select expression
     *
     * @private
     *
     * @param {string} select The select expression
     * @param {mixed} params The params to be injected into the select expression
     *
     * @return {string} Select expression with injected parameters
     */
    injectParams(select, params) {
        if (_.isPlainObject(params) && !moment.isMoment(params) && !(params instanceof Date)) {
            return this.injectParamsObject(select, params);
        }

        if (!_.isArray(params)) {
            params = [params];
        }

        return this.injectParamsArray(select, params);
    }

    /**
     * Injects array of parameters into the select expression
     *
     * @private
     * @source https://github.com/sequelize/sequelize/blob/master/lib/sql-string.js -> SqlString.format
     *
     * @param {string} select The select expression
     * @param {array} params The params to be injected into the select expression
     *
     * @return {string} Select expression with injected parameters
     */
    injectParamsArray(select, params) {
        return select.replace(/\?/g, (match) => {
            if (!params.length) {
                return match;
            }

            return this.convertParam(params.shift());
        });
    }

    /**
     * Injects array of parameters into the select expression
     *
     * @private
     * @source https://github.com/sequelize/sequelize/blob/master/lib/sql-string.js -> SqlString.formatNamedParameters
     *
     * @param {string} select The select expression
     * @param {object} params The params to be injected into the select expression
     *
     * @return {string} Select expression with injected parameters
     */
    injectParamsObject(select, params) {
        return select.replace(/\:+(?!\d)(\w+)/g, (value, key) => {
            if (params[key] !== undefined) {
                return this.convertParam(params[key]);
            }

            throw new Error('[1438415385] Named parameter "' + value + '" has no value in the given object.');
        });
    }

    /**
     * Converts a param to proper ocl expression style.
     * Currently only a date will be converted.
     *
     * @private
     *
     * @param {mixed} param Param to convert
     *
     * @return {string} Converted param
     */
    convertParam(param) {
        if (param instanceof Date || moment.isMoment(param)) {
            return 'encodeDate(' + moment(param).format('YYYY,M,D') + ')';
        }

        return param;
    }

    /**
     * Builds the select request object out of ocl expression data
     *
     * @private
     *
     * @param {string} select The select expression
     * @param {array} fields The fields to be fetched
     *
     * @return {object} Select object
     */
    buildSelectObject(select, fields) {
        var contentObject = this.buildSelectBody(select);

        if (!_.isEmpty(fields)) {
            var fieldOptions = this.convertFieldOptions(fields);
            contentObject.Body[0].Query.push({
                Resultdef: fieldOptions
            });
        }

        return contentObject;
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
            Envelope: [
                this.buildXmlHeader(),
                bodyObject
            ]
        };

        var xmlString = xmlBuilder(contentObject, { declaration: true });
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
            Header: [
                {
                    BasicAuth: [
                        {
                            Name: this.username
                        },
                        {
                            Password: this.password
                        }
                    ]
                }
            ]
        };
    }

    /**
     * Builds the body part of the XML Request containing the ocl select expression
     *
     * @private
     *
     * @param {mixed} select OCL Expression
     *
     * @return {object} Body part of the XML request
     */
    buildSelectBody(select) {
        var content = {
            Body: [
                {
                    Query: [
                        {
                            Selection: []
                        }
                    ]
                }
            ]
        };

        if (_.isPlainObject(select)) {
            content.Body[0].Query[0].Selection = this.convertObjectToXmlFriendlyFormat(select);
        } else {
            content.Body[0].Query[0].Selection.push({
                ocl: select
            });
        }

        return content;
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
            Body: [
                {
                    Delete: []
                }
            ]
        };

        _.each(ids, (id) => {
            if (_.isNaN(parseInt(id))) {
                throw new Error('[1439056797] Delete id must be a number');
            }

            content.Body[0].Delete.push({
                objref: parseInt(id)
            });
        });

        return content;
    }

    /**
     * Builds the body part of the XML Request containing the create cmds
     *
     * @private
     *
     * @param {array} saveObjects An array of objects to create or update
     *
     * @return {object} Body part of the XML request
     */
    buildSaveBody(saveObjects) {
        var content = {
            Body: []
        };
        var createObjects = [];
        var updateObjects = [];

        _.each(saveObjects, (saveObject) => {
            if (!_.isString(saveObject.className) || !_.isPlainObject(saveObject.data)) {
                throw new Error('[1439114369] No valid create object data found');
            }

            var tempObject = {};
            tempObject[saveObject.className] = this.convertObjectToXmlFriendlyFormat(saveObject.data);

            var targetArray = saveObject.data.objref ? updateObjects : createObjects;

            targetArray.push(tempObject);
        });

        if (createObjects.length > 0) {
            content.Body.push({
                Create: createObjects
            });
        }

        if (updateObjects.length > 0) {
            content.Body.push({
                Update: updateObjects
            });
        }

        return content;
    }

    /**
     * Converts an object to a xml friendly format
     *
     * @param {object} data Object data to convert
     *
     * @return {Array} From object to array converted data
     */
    convertObjectToXmlFriendlyFormat(data) {
        var content = [];

        _.each(data, (objectValue, objectKey) => {
            if (_.isArray(objectValue)) {
                return _.each(objectValue, (arrayValue) => {
                    let temp = {};
                    temp[objectKey] = arrayValue;
                    content.push(temp);
                });
            }

            let temp = {};
            if (_.isPlainObject(objectValue)) {
                objectValue = this.convertObjectToXmlFriendlyFormat(objectValue);
            }
            temp[objectKey] = objectValue;
            content.push(temp);
        });

        return content;
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
        var fieldOptions = [];
        _.forEach(fields, (field) => {
            if (_.isString(field)) {
                return fieldOptions.push({
                    member: field
                });
            }

            if (_.isObject(field)) {
                return fieldOptions.push({
                    expression: this.convertObjectToXmlFriendlyFormat(field)
                });
            }

            throw new Error('[1437849815] Unknown field type');
        });

        return fieldOptions;
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
