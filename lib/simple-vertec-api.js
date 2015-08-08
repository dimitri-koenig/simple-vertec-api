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
        this.request = require('request-promise');
    }

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
    select() {
        var select = arguments[0];
        var params = arguments.length === 3 ? arguments[1] : null;
        var fields = arguments.length === 3 ? arguments[2] : arguments[1];

        if (arguments.length < 2) {
            throw new Error('[1438427960] no select and fields arguments given');
        }

        if (arguments.length >= 2 && ((!_.isString(select) && !_.isPlainObject(select)) || !_.isArray(fields))) {
            throw new Error('[1438428337] no valid select and fields arguments given');
        }

        select = this.handleSelectObject(select);
        if (params !== null) {
            select = this.injectParams(select, params);
        }
        select = this.handleSelectObject(select);

        var selectObject = this.buildSelectObject(select, fields);
        var xmlString = this.buildXml(selectObject);

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
    handleSelectObject(select) {
        var selectArray;

        if (_.isString(select) && select.indexOf('|||') !== -1) {
            selectArray = select.split('|||');

            return {
                ocl:   selectArray[0],
                where: selectArray[1],
                order: selectArray[2]
            };
        }

        if (_.isPlainObject(select)) {
            selectArray = [
                select.ocl || '',
                select.where || '',
                select.order || ''
            ];

            return selectArray.join('|||');
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
        var contentObject = this.buildXmlBody(select);

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

        var xmlString = xmlBuilder(contentObject);
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
    buildXmlBody(select) {
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

        content.Body[0].Query[0].Selection.push({
            ocl: _.isPlainObject(select) ? (select.ocl || '') : select
        });

        if (_.isPlainObject(select)) {
            content.Body[0].Query[0].Selection.push({
                sqlwhere: select.where || ''
            });
            content.Body[0].Query[0].Selection.push({
                sqlorder: select.order || ''
            });
        }

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
        var self = this;
        var requestOptions = {
            uri:     this.url,
            method:  'POST',
            headers: {
                'Content-Type': 'application/xml'
            },
            body:    xmlString
        };

        return this.request(requestOptions).then((xmlContent) => {
            return new q((resolve, reject) => {
                digester.digest(xmlContent, (err, jsonContent) => {
                    self.log(xmlContent, jsonContent);

                    if (xmlContent.match(/<fault>/i)) {
                        return reject(jsonContent.Envelope.Body);
                    }

                    return resolve(jsonContent.Envelope.Body.QueryResponse);
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
