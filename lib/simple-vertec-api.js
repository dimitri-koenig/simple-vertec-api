'use strict';

var xmlBuilder = require('xml');
var _ = require('lodash');
var util = require('util');
var xmlDigester = require('xml-digester');
var xmlDigesterLogger = xmlDigester._logger;
var digester = xmlDigester.XmlDigester({});
var Promise = require('bluebird');
var logger;

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
    this.request = require('request-promise');

    logger = {
        log: function () {
            if (verbose === true) {
                for (var i = 0; i < arguments.length; i++) {
                    console.log(util.inspect(arguments[i], { //eslint-disable-line no-console
                        colors: true,
                        depth:  null
                    }));
                }
            }
        }
    };
};

(function () {
    /**
     * Your one and only query method.
     *
     * Example: see the first up above
     *
     * @return Promise
     */
    this.query = function () {
        var xmlString = this.buildXml.apply(this, arguments);

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
    this.buildXml = function (select, fields) {
        var contentObject = {
            Envelope: [
                this.buildXmlHeader(),
                this.buildXmlBody(select)
            ]
        };

        if (!_.isEmpty(fields) && !_.isArray(fields)) {
            throw new Error('[1438412211] fields argument has to be an array');
        }

        if (_.isArray(fields)) {
            var fieldOptions = this.buildFieldOptions(fields);

            contentObject.Envelope[1].Body[0].Query.push({
                Resultdef: fieldOptions
            });
        }

        var xmlString = xmlBuilder(contentObject);

        logger.log(arguments, contentObject, xmlString);

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
        if (_.isEmpty(select)) {
            throw new Error('[1437846575] select is empty');
        }

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
        return this.request(requestOptions).then(function (xmlContent) {
            return new Promise(function (resolve, reject) {
                digester.digest(xmlContent, function (err, jsonContent) {
                    logger.log(xmlContent, jsonContent);

                    if (xmlContent.match(/<fault>/i)) {
                        return reject(jsonContent.Envelope.Body);
                    }

                    return resolve(jsonContent.Envelope.Body.QueryResponse);
                });
            });
        });
    };
}).call(SimpleVertecApi.prototype);
