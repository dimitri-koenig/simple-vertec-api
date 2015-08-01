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
 * Using one simple 'query' method with one simple object as parameter
 * should be sufficient enough to get some data out of vertec.
 *
 * # Example
 *
 * var api = SimpleVertecApi('https://your-vertec-host.com:8080', 'your-username', 'your-password');
 * api.query({
 *   select: 'some vertec ocl expression',
 *   fields: [
 *     'simple-parameter',
 *     {
 *       alias: 'simple-alias',
 *       ocl: 'ocl-expression'
 *     }
 *   ]
 * }).then(function(result) {
 *   // do something
 * });
 *
 * @constructor
 * @export
 *
 * @param {string} Your Vertec host url
 * @param {string} Your Vertec username
 * @param {string} Your Vertec password
 * @param {boolean} Verbose: set true for some debugging data
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
     * Example: see the first up above
     *
     * @return {Promise} q
     */
    this.query = function () {
        var queryOptions = arguments;

        if (arguments.length < 2) {
            throw new Error('[1438427960] no select and fields arguments given');
        }

        if (arguments.length === 2 && (!_.isString(arguments[0]) || !_.isArray(arguments[1]))) {
            throw new Error('[1438428337] no valid select and fields arguments given');
        }

        if (arguments.length === 3 && (!_.isString(arguments[0]) || !_.isArray(arguments[2]))) {
            throw new Error('[1438428671] no valid select, param and fields arguments given');
        }

        if (arguments.length === 3) {
            queryOptions = [
                this.injectParams(arguments[0], arguments[1]),
                arguments[2]
            ];
        }

        var xmlString = this.buildXml.apply(this, queryOptions);

        var requestOptions = {
            uri:     this.url,
            method:  'POST',
            headers: {
                'Content-Type': 'application/xml'
            },
            body:    xmlString
        };

        return this.doRequest(requestOptions);
    };

    /**
     * @private
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
     * @private
     * @source https://github.com/sequelize/sequelize/blob/master/lib/sql-string.js -> SqlString.format
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
     * @private
     * @source https://github.com/sequelize/sequelize/blob/master/lib/sql-string.js -> SqlString.formatNamedParameters
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
     * @private
     */
    this.convertParam = function (param) {
        if (param instanceof Date) {
            return 'encodeDate(' + moment(param).format('YYYY,M,D') + ')';
        }

        return param;
    };

    /**
     * @private
     */
    this.buildXml = function (select, fields) {
        var contentObject = {
            Envelope: [
                this.buildXmlHeader(),
                this.buildXmlBody(select)
            ]
        };

        if (!_.isEmpty(fields)) {
            var fieldOptions = this.buildFieldOptions(fields);
            contentObject.Envelope[1].Body[0].Query.push({
                Resultdef: fieldOptions
            });
        }

        var xmlString = xmlBuilder(contentObject);
        this.log(arguments, contentObject, xmlString);

        return xmlString;
    };

    /**
     * @private
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
     * @private
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

    this.buildFieldOptions = function (fields) {
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
                            ocl: field.ocl
                        }
                    ]
                });
            }

            throw new Error('[1437849815] Unknown field type');
        });

        return fieldOptions;
    };

    /**
     * @private
     */
    this.doRequest = function (requestOptions) {
        var self = this;
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
     * @private
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
