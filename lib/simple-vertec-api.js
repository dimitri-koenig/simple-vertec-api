'use strict';

var xmlBuilder          = require('xml'),
    _                   = require('lodash'),
    logger              = console,
    xml_digester        = require('xml-digester'),
    xml_digester_logger = xml_digester._logger,
    digester            = xml_digester.XmlDigester({}),
    Promise             = require('bluebird');

xml_digester_logger.level(xml_digester_logger.WARN_LEVEL);

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
 *   select: 'some vertec ocl expression'
 * });
 *
 * @constructor
 * @export
 * @this {SimpleVertecApi}
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

    if (verbose !== true) {
        logger = {
            log: function () {
            }
        };
    }
};

(function () {
    /**
     * Your one and only query method.
     *
     * # Example:
     *
     * SimpleVertecApi::query({
     *   select: 'some vertec ocl expression',
     *   fields: [
     *     'simple-parameter',
     *     {
     *       alias: 'simple-alias',
     *       ocl: 'ocl-expression'
     *     }
     *   ]
     * });
     *
     * @param queryOptions
     *
     * @return Promise
     */
    this.query = function (queryOptions) {
        if (_.isEmpty(queryOptions.select)) {
            throw new Error('[1437846575] Called without a select option');
        }

        var xmlString = this.buildXml(queryOptions);

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
    this.buildXml = function (queryOptions) {
        var contentObject = {
            Envelope: [
                {
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
                },
                {
                    Body: [
                        {
                            Query: [
                                {
                                    Selection: [
                                        {
                                            ocl: queryOptions.select
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        if (_.isArray(queryOptions.fields)) {
            var fieldOptions = [];
            _.forEach(queryOptions.fields, function (field) {
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

            contentObject.Envelope[1].Body[0].Query.push({
                Resultdef: fieldOptions
            });
        }

        var xmlString = xmlBuilder(contentObject);

        logger.log(queryOptions, contentObject, xmlString);

        return xmlString;
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
