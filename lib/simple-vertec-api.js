'use strict';

var xmlBuilder = require('xml');
var _ = require('lodash');
var util = require('util');
var xmlDigester = require('xml-digester');
var xmlDigesterLogger = xmlDigester._logger;
var digester = xmlDigester.XmlDigester({});
var q = require('bluebird');
var moment = require('moment');

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
var SimpleVertecApi = module.exports.SimpleVertecApi = function (url, username, password, verbose) {
    this.url = url;
    this.username = username;
    this.password = password;
    this.verbose = verbose;
    this.request = require('request-promise');
};

(function () {
    /**
     * Your one and only query method.
     *
     * First parameter is select
     * If only 2 params given then the second param is the fields array
     * If 3 params given then the second param is the params array
     * and the third param is the fields array
     *
     * Example: take a look at the README file
     *
     * @return {Promise} Promise for the request
     */
    this.query = function () {
        var select = arguments[0];
        var params = arguments.length === 3 ? arguments[1] : null;
        var fields = arguments.length === 3 ? arguments[2] : arguments[1];

        if (arguments.length < 2) {
            throw new Error('[1438427960] no select and fields arguments given');
        }

        if (arguments.length >= 2 && (!_.isString(select) || !_.isArray(fields))) {
            throw new Error('[1438428337] no valid select and fields arguments given');
        }

        if (params !== 3) {
            select = this.injectParams(select, params);
        }

        var xmlString = this.buildXml(select, fields);

        return this.doRequest(xmlString);
    };

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
    this.injectParams = function (select, params) {
        if (_.isPlainObject(params) && !(params instanceof Date)) {
            return this.injectParamsObject(select, params);
        }

        if (!_.isArray(params)) {
            params = [params];
        }

        return this.injectParamsArray(select, params);
    };

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
    this.injectParamsArray = function (select, params) {
        var self = this;
        return select.replace(/\?/g, function (match) {
            if (!params.length) {
                return match;
            }

            return self.convertParam(params.shift());
        });
    };

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
    this.injectParamsObject = function (select, params) {
        var self = this;
        return select.replace(/\:+(?!\d)(\w+)/g, function (value, key) {
            if (params[key] !== undefined) {
                return self.convertParam(params[key]);
            }

            throw new Error('[1438415385] Named parameter "' + value + '" has no value in the given object.');
        });
    };

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
    this.convertParam = function (param) {
        if (param instanceof Date) {
            return 'encodeDate(' + moment(param).format('YYYY,M,D') + ')';
        }

        return param;
    };

    /**
     * Builds the xml request string out of ocl expression data
     *
     * @private
     *
     * @param {string} select The select expression
     * @param {array} fields The fields to be fetched
     *
     * @return {string} Built XML String
     */
    this.buildXml = function (select, fields) {
        var contentObject = {
            Envelope: [
                this.buildXmlHeader(),
                this.buildXmlBody(select)
            ]
        };

        if (!_.isEmpty(fields)) {
            var fieldOptions = this.convertFieldOptions(fields);
            contentObject.Envelope[1].Body[0].Query.push({
                Resultdef: fieldOptions
            });
        }

        var xmlString = xmlBuilder(contentObject);
        this.log(arguments, contentObject, xmlString);

        return xmlString;
    };

    /**
     * Builds the auth part of the XML Request
     *
     * @private
     *
     * @return {object} Auth part of the XML request
     */
    this.buildXmlHeader = function () {
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
    };

    /**
     * Builds the body part of the XML Request containing the ocl select expression
     *
     * @private
     *
     * @param {string} select OCL Expression
     *
     * @return {object} Body part of the XML request
     */
    this.buildXmlBody = function (select) {
        return {
            Body: [
                {
                    Query: [
                        {
                            Selection: [
                                {
                                    ocl: select
                                }
                            ]
                        }
                    ]
                }
            ]
        };
    };

    /**
     * Converts fields to proper XML ready format
     *
     * @private
     *
     * @param {array} fields Array of field definitions
     *
     * @return {array} Array of XML conversion ready fields
     */
    this.convertFieldOptions = function (fields) {
        var fieldOptions = [];
        _.forEach(fields, function (field) {
            if (_.isString(field)) {
                return fieldOptions.push({
                    member: field
                });
            }

            if (_.isObject(field)) {
                return fieldOptions.push({
                    expression: [
                        {
                            alias: field.alias
                        },
                        {
                            ocl: field.expression
                        }
                    ]
                });
            }

            throw new Error('[1437849815] Unknown field type');
        });

        return fieldOptions;
    };

    /**
     * Does the actual request
     *
     * @private
     *
     * @param {string} xmlString The XML request string
     *
     * @return {Promise} Promise for the request
     */
    this.doRequest = function (xmlString) {
        var self = this;
        var requestOptions = {
            uri:     this.url,
            method:  'POST',
            headers: {
                'Content-Type': 'application/xml'
            },
            body:    xmlString
        };

        return this.request(requestOptions).then(function (xmlContent) {
            return new q(function (resolve, reject) {
                digester.digest(xmlContent, function (err, jsonContent) {
                    self.log(xmlContent, jsonContent);

                    if (xmlContent.match(/<fault>/i)) {
                        return reject(jsonContent.Envelope.Body);
                    }

                    return resolve(jsonContent.Envelope.Body.QueryResponse);
                });
            });
        });
    };

    /**
     * Custom log method
     *
     * @private
     *
     * @return {void}
     */
    this.log = function () {
        if (this.verbose === true) {
            for (var i = 0; i < arguments.length; i++) {
                console.log(util.inspect(arguments[i], { // eslint-disable-line no-console
                    colors: true,
                    depth:  null
                }));
            }
        }
    };
}).call(SimpleVertecApi.prototype);
