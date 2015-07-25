'use strict';

var xmlBuilder = require('xml'),
    _          = require('lodash'),
    logger     = console;

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
    this.query = function (queryOptions) {
        if (_.isEmpty(queryOptions.select)) {
            throw new Error('Called without a select option', 1437846575);
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

                throw new Error('Unknown field type', 1437849815);
            });

            contentObject.Envelope[1].Body[0].Query.push({
                Resultdef: fieldOptions
            })
        }

        var xmlString = xmlBuilder(contentObject);

        logger.log(queryOptions, contentObject, xmlString);

        return xmlString;
    };

    this.doRequest = function (requestOptions) {
        return this.request(requestOptions).then(function (content) {
            return content;
        });
    };

    this.meineLeistungen = function () {
        var queryOptions = {
            select: 'Timsession.allInstances->first.login.verrechneteLeistungen->union(Timsession.allInstances->first.login.offeneLeistungen)',
            fields: [
                'datum',
                {
                    alias: 'projekt',
                    ocl:   'projekt.code'
                }
            ]
        };

        return this.query(queryOptions);
    };

}).call(SimpleVertecApi.prototype);
