import {SimpleVertecApi, SimpleVertecQuery} from '../lib/index.js';
import {expect} from 'chai';
import sinon from 'sinon';
import _ from 'lodash';

/**
 * Checks actual string which gets filtered with new lines and intendation spaces against expected string
 *
 * @private
 *
 * @param {string} actual Actual string
 * @param {string} expected Expected string
 *
 * @return {void}
 */
function compareFilteredString(actual, expected) {
    expect(actual.replace(/\n */g, '')).to.equal(expected);
}

function newDate() {
    return new Date().getTime() / 1000 | 0;
}

describe('SimpleVertecQuery', () => {
    let api;
    let buildSelectObjectSpy;

    let apiResponse = obj => {
        sinon.stub(api, 'doRequest').callsFake(() => {
            return new Promise((resolve) => {
                resolve(obj);
            });
        });
    };

    beforeEach('suite setup', () => {
        api = new SimpleVertecApi('http://localhost', 'my-api-key');
        buildSelectObjectSpy = sinon.spy(api, 'buildSelectObject');

        SimpleVertecQuery.setApi(api);
    });

    describe('some basics', () => {
        it('sets default api', () => {
            expect(SimpleVertecQuery.api).to.equal(api);
        });

        it('sets cache instance', () => {
            let fakeCache = {};
            SimpleVertecQuery.setCache(fakeCache);

            expect(SimpleVertecQuery.cache).to.equal(fakeCache);
        });

        it('sets app cache key', () => {
            let appCacheKey = 'my-app';
            SimpleVertecQuery.setAppCacheKey(appCacheKey);

            expect(SimpleVertecQuery.appCacheKey).to.equal(appCacheKey);
        });

        it('sets raw options via construtor', () => {
            let newOptions = {
                query: {
                    objref: [123, 234]
                },
                params: {
                    test: 123
                },
                fields: [
                    {
                        ocl: 'test-ocl',
                        alias: 'test-alias'
                    }
                ],
                transformers: [
                    response => {
                        return {
                            newResponse: response + 'it works'
                        };
                    }
                ]
            };

            let query = new SimpleVertecQuery(newOptions);

            expect(query.options.query.objref).to.deep.equal(newOptions.query.objref);
            expect(query.options.query.params).to.deep.equal(newOptions.query.params);
            expect(query.options.query.fields).to.deep.equal(newOptions.query.fields);
            expect(query.options.query.transformers).to.deep.equal(newOptions.query.transformers);
        });
    });

    describe('method chaining', () => {
        it('all builder methods return the query instance', () => {
            let query = new SimpleVertecQuery();
            expect(query.findById(1)).to.equal(query);
            expect(query.whereOcl('x')).to.equal(query);
            expect(query.whereSql('y')).to.equal(query);
            expect(query.orderBy('z')).to.equal(query);
            expect(query.addParam('a')).to.equal(query);
            expect(query.addParams('b', 'c')).to.equal(query);
            expect(query.addField('d')).to.equal(query);
            expect(query.addFields('e', 'f')).to.equal(query);
            expect(query.setCacheTTL(10)).to.equal(query);
            expect(query.setCacheGraceTime(5)).to.equal(query);
            expect(query.setCacheKey('k')).to.equal(query);
            expect(query.setCacheName('n')).to.equal(query);
            expect(query.addTransformer(() => {})).to.equal(query);
            expect(query.filterProperty('p')).to.equal(query);
            expect(query.setRootKey('r')).to.equal(query);
            expect(query.usingSlowLane()).to.equal(query);
            expect(query.zip('z')).to.equal(query);
        });
    });

    describe('query testing', () => {
        beforeEach('query setup', () => {
            apiResponse({it: 'works'});
        });

        it('findById() sets objref as query param', () => {
            new SimpleVertecQuery().findById(123).get();

            expect(buildSelectObjectSpy.returnValues.pop()).to.deep.equal({
                Query: {
                    Resultdef: {
                        expression: [],
                        member: []
                    },
                    Selection: {
                        objref: 123
                    }
                }
            });
        });

        it('findById() sets array of ids as one objref as query param', () => {
            new SimpleVertecQuery().findById([123, 234]).get();

            expect(buildSelectObjectSpy.returnValues.pop()).to.deep.equal({
                Query: {
                    Resultdef: {
                        expression: [],
                        member: []
                    },
                    Selection: {
                        objref: [123, 234]
                    }
                }
            });
        });

        it('whereOcl() sets ocl as query param', () => {
            new SimpleVertecQuery().whereOcl('something').get();

            expect(buildSelectObjectSpy.returnValues.pop()).to.deep.equal({
                Query: {
                    Resultdef: {
                        expression: [],
                        member: []
                    },
                    Selection: {
                        ocl: 'something'
                    }
                }
            });
        });

        it('whereSql() sets sqlwhere as query param', () => {
            new SimpleVertecQuery().whereSql('something').get();

            expect(buildSelectObjectSpy.returnValues.pop()).to.deep.equal({
                Query: {
                    Resultdef: {
                        expression: [],
                        member: []
                    },
                    Selection: {
                        sqlwhere: 'something'
                    }
                }
            });
        });

        it('orderBy() sets sqlorder as query param', () => {
            new SimpleVertecQuery().orderBy('something').get();

            expect(buildSelectObjectSpy.returnValues.pop()).to.deep.equal({
                Query: {
                    Resultdef: {
                        expression: [],
                        member: []
                    },
                    Selection: {
                        sqlorder: 'something'
                    }
                }
            });
        });

        it('addParam() adds one string param to params array', () => {
            new SimpleVertecQuery().whereOcl('x = ?, y = ?').addParam('123').addParam('234').get();

            expect(buildSelectObjectSpy.returnValues.pop()).to.deep.equal({
                Query: {
                    Resultdef: {
                        expression: [],
                        member: []
                    },
                    Selection: {
                        ocl: 'x = 123, y = 234'
                    }
                }
            });
        });

        it('addParam() merges object param and one property with params object', () => {
            new SimpleVertecQuery().whereOcl('x = :x, y = :y, z = :z').addParam({x: 123}).addParam({y: 234, z: 345}).get();

            expect(buildSelectObjectSpy.returnValues.pop()).to.deep.equal({
                Query: {
                    Resultdef: {
                        expression: [],
                        member: []
                    },
                    Selection: {
                        ocl: 'x = 123, y = 234, z = 345'
                    }
                }
            });
        });

        it('addParams() adds multiple string params to params array', () => {
            new SimpleVertecQuery().whereOcl('x = ?, y = ?').addParams('123', '234').get();

            expect(buildSelectObjectSpy.returnValues.pop()).to.deep.equal({
                Query: {
                    Resultdef: {
                        expression: [],
                        member: []
                    },
                    Selection: {
                        ocl: 'x = 123, y = 234'
                    }
                }
            });
        });

        it('addField() adds a field to fields array', () => {
            new SimpleVertecQuery()
                .addField('code')
                .addField('date')
                .addField({ocl: 'something', alias: 'else'})
                .addField('foo', 'bar')
                .get();

            expect(buildSelectObjectSpy.returnValues.pop()).to.deep.equal({
                Query: {
                    Resultdef: {
                        expression: [
                            {
                                ocl: 'something',
                                alias: 'else'
                            },
                            {
                                ocl: 'foo',
                                alias: 'bar'
                            }
                        ],
                        member: [
                            'code',
                            'date'
                        ]
                    },
                    Selection: {}
                }
            });
        });

        it('addFields() adds multiple fields as multiple arguments to fields array', () => {
            new SimpleVertecQuery()
                .addField('code')
                .addField({ocl: 'something', alias: 'else'})
                .addFields(
                    {ocl: 'foo', alias: 'bar'},
                    'date', 'title',
                    {ocl: 'bla', alias: 'blub'}
                )
                .get();

            expect(buildSelectObjectSpy.returnValues.pop()).to.deep.equal({
                Query: {
                    Resultdef: {
                        expression: [
                            {
                                ocl: 'something',
                                alias: 'else'
                            },
                            {
                                ocl: 'foo',
                                alias: 'bar'
                            },
                            {
                                ocl: 'bla',
                                alias: 'blub'
                            }
                        ],
                        member: [
                            'code',
                            'date',
                            'title'
                        ]
                    },
                    Selection: {}
                }
            });
        });

        it('addFields() adds multiple fields as one array argument to fields array', () => {
            new SimpleVertecQuery()
                .addField('code')
                .addField({ocl: 'something', alias: 'else'})
                .addFields([
                    {ocl: 'foo', alias: 'bar'},
                    'date', 'title',
                    {ocl: 'bla', alias: 'blub'}
                ])
                .get();

            expect(buildSelectObjectSpy.returnValues.pop()).to.deep.equal({
                Query: {
                    Resultdef: {
                        expression: [
                            {
                                ocl: 'something',
                                alias: 'else'
                            },
                            {
                                ocl: 'foo',
                                alias: 'bar'
                            },
                            {
                                ocl: 'bla',
                                alias: 'blub'
                            }
                        ],
                        member: [
                            'code',
                            'date',
                            'title'
                        ]
                    },
                    Selection: {}
                }
            });
        });

        it('setCacheKey() sets cache key for cache objects', () => {
            let query = new SimpleVertecQuery().setCacheKey('test1');
            expect(query.options.cacheKey).to.equal('test1');
        });

        it('setCacheName() sets cache name for cache objects', () => {
            let query = new SimpleVertecQuery().setCacheName('test1');
            expect(query.options.cacheName).to.equal('test1');
        });

        it('setCacheTTL() sets ttl for cache objects', () => {
            let query = new SimpleVertecQuery().setCacheTTL(10);
            expect(query.options.cacheTTL).to.equal(10);
        });

        it('setCacheGraceTime() sets grace time for cache objects', () => {
            let query = new SimpleVertecQuery().setCacheGraceTime(10);
            expect(query.options.cacheGraceTime).to.equal(10);
        });

        describe('get()', () => {
            it('compiles an empty query when no options set', () => {
                new SimpleVertecQuery().get();

                expect(buildSelectObjectSpy.returnValues.pop()).to.deep.equal({
                    Query: {
                        Resultdef: {
                            expression: [],
                            member: []
                        },
                        Selection: {}
                    }
                });
            });

            it('compiles a query when all select options set', () => {
                new SimpleVertecQuery().findById(123).whereOcl('leistungen').whereSql('something').orderBy('date').get();

                expect(buildSelectObjectSpy.returnValues.pop()).to.deep.equal({
                    Query: {
                        Resultdef: {
                            expression: [],
                            member: []
                        },
                        Selection: {
                            objref: 123,
                            ocl: 'leistungen',
                            sqlwhere: 'something',
                            sqlorder: 'date'
                        }
                    }
                });
            });

            it('requests two independent queries', () => {
                let firstQuery = new SimpleVertecQuery().findById(123).whereOcl('leistungen').addField('code');
                let secondQuery = new SimpleVertecQuery().whereSql('x = ?').addParam(234).orderBy('date').addField('title');

                firstQuery.get();
                secondQuery.get();

                expect(buildSelectObjectSpy.returnValues.shift()).to.deep.equal({
                    Query: {
                        Resultdef: {
                            expression: [],
                            member: ['code']
                        },
                        Selection: {
                            objref: 123,
                            ocl: 'leistungen'
                        }
                    }
                });

                expect(buildSelectObjectSpy.returnValues.pop()).to.deep.equal({
                    Query: {
                        Resultdef: {
                            expression: [],
                            member: ['title']
                        },
                        Selection: {
                            sqlwhere: 'x = 234',
                            sqlorder: 'date'
                        }
                    }
                });
            });
        });
    });

    describe('transformation testing', () => {
        it('returns raw request result if no property filter defined', (done) => {
            let returnObject = {it: 'works 1'};

            apiResponse(returnObject);

            new SimpleVertecQuery().get().then(response => {
                expect(response.data).to.deep.equal(returnObject);
                done();
            });
        });

        it('adds one transformer', (done) => {
            let returnObject = {data: '123'};

            apiResponse(returnObject);

            let transformer = result => {
                result.data = parseInt(result.data);

                return result;
            };

            new SimpleVertecQuery().addTransformer(transformer).get().then(response => {
                expect(response.data.data).to.equal(123);
                done();
            });
        });

        it('adds multiple transformers', (done) => {
            let returnObject = {data1: '123'};

            apiResponse(returnObject);

            let transformer1 = result => {
                result.data2 = parseInt(result.data1);

                return result;
            };

            let transformer2 = result => {
                result.data3 = result.data2 * 10;

                return result;
            };

            new SimpleVertecQuery().addTransformer(transformer1).addTransformer(transformer2).get().then(response => {
                expect(response.data.data1).to.equal('123');
                expect(response.data.data2).to.equal(123);
                expect(response.data.data3).to.equal(1230);
                done();
            });
        });

        it('uses a property filter', (done) => {
            let returnObject = {myKey: {it: 'works'}};

            apiResponse(returnObject);

            new SimpleVertecQuery().filterProperty('myKey').get().then(response => {
                expect(response.data).to.deep.equal({it: 'works'});
                done();
            });
        });

        it('uses a property filter with not existing property', (done) => {
            let returnObject = {myKey: {it: 'works'}};

            apiResponse(returnObject);

            new SimpleVertecQuery().filterProperty('myNotExistingKey').get().then(response => {
                expect(response).to.deep.equal(undefined);
                done();
            });
        });

        it('uses a property filter with array transformation', (done) => {
            let returnObject = {myKey: {it: 'works'}};

            apiResponse(returnObject);

            new SimpleVertecQuery().filterProperty('myKey', true).get().then(response => {
                expect(response.data).to.deep.equal([{it: 'works'}]);
                done();
            });
        });

        it('uses a property filter with array transformation on an array', (done) => {
            let returnObject = {myKey: [{it: 'works'}]};

            apiResponse(returnObject);

            new SimpleVertecQuery().filterProperty('myKey', true).get().then(response => {
                expect(response.data).to.deep.equal([{it: 'works'}]);
                done();
            });
        });

        it('uses a property filter with array transformation on an not existing key', (done) => {
            let returnObject = {myKey: {it: 'works'}};

            apiResponse(returnObject);

            new SimpleVertecQuery().filterProperty('myNotExistingKey', true).get().then(response => {
                expect(response.data).to.deep.equal([]);
                done();
            });
        });

        it('uses a property filter and multiple transformers all generating new return arrays', () => {
            let returnObject = {myKey: {it: 'works', data1: '123'}, should: {be: 'filtered'}};

            apiResponse(returnObject);

            let transformer1 = result => {
                let newResult = {
                    it: result[0].it,
                    data2: parseInt(result[0].data1)
                };

                return newResult;
            };

            let transformer2 = result => {
                let newResult = [
                    result,
                    result.data2 * 10
                ];

                return newResult;
            };

            return new SimpleVertecQuery().filterProperty('myKey', true).addTransformer(transformer1).addTransformer(transformer2).get().then(response => {
                expect(response.data).to.deep.equal([
                    {
                        it: 'works',
                        data2: 123
                    },
                    1230
                ]);
            });
        });

        it('uses correct order of added transformers', () => {
            apiResponse({myKey: {start: 3}});

            return new SimpleVertecQuery()
                .addTransformer(response => {
                    let newResponse = {start: response.start *= 3};
                    return newResponse;
                })
                .addTransformer(response => {
                    let newResponse = {start: response.start += 3};
                    return newResponse;
                })
                .addTransformer(response => {
                    let newResponse = {start: response.start *= 3};
                    return newResponse;
                })
                .addTransformer(response => {
                    let newResponse = {start: response.start += 3};
                    return newResponse;
                })
                .filterProperty('myKey')
                .addTransformer(response => {
                    let newResponse = {start: response.start += 3};
                    return newResponse;
                })
                .addTransformer(response => {
                    let newResponse = {start: response.start *= 3};
                    return newResponse;
                })
                .addTransformer(response => {
                    let newResponse = {start: response.start += 3};
                    return newResponse;
                })
                .addTransformer(response => {
                    let newResponse = {start: response.start *= 3};
                    return newResponse;
                })
                .get()
                .then(response => {
                    expect(response.data.start).to.equal(387);
                });
        });

        it('does not duplicate filter properties transformer on repeated get() calls', () => {
            let callCount = 0;
            sinon.stub(api, 'doRequest').callsFake(() => {
                callCount++;
                return new Promise((resolve) => {
                    resolve({myKey: {it: 'works ' + callCount}});
                });
            });

            let query = new SimpleVertecQuery().filterProperty('myKey');

            return query.get().then(response => {
                expect(response.data).to.deep.equal({it: 'works 1'});

                return query.get();
            }).then(response => {
                // Without the fix, the filter transformer would be applied twice,
                // trying to access 'myKey' on the already-filtered result
                expect(response.data).to.deep.equal({it: 'works 2'});
            });
        });

        it('returns undefined when api response is falsy', () => {
            apiResponse(null);

            return new SimpleVertecQuery().get().then(response => {
                expect(response).to.be.null;
            });
        });

        it('returns undefined when api response is undefined', () => {
            apiResponse(undefined);

            return new SimpleVertecQuery().get().then(response => {
                expect(response).to.be.undefined;
            });
        });

        it('takes another root key using setRootKey', (done) => {
            let returnObject = {it: 'works 15'};

            apiResponse(returnObject);

            new SimpleVertecQuery().setRootKey('newRootKey').get().then(response => {
                expect(response.data).to.be.undefined;
                expect(response.newRootKey).to.deep.equal(returnObject);
                done();
            });
        });

        describe('zip field testing', () => {
            it('zips a field with one entry and one key', () => {
                let returnObject = {
                    myKey: {
                        id: 123
                    }
                };

                apiResponse(returnObject);

                return new SimpleVertecQuery().zip('myKey').get().then(response => {
                    expect(response.data).to.deep.equal({
                        myKey: [
                            {
                                id: 123
                            }
                        ]
                    });
                });
            });

            it('zips a field with two entries and each with one key', () => {
                let returnObject = {
                    myKey: {
                        id: [123, 234]
                    }
                };

                apiResponse(returnObject);

                return new SimpleVertecQuery().zip('myKey').get().then(response => {
                    expect(response.data).to.deep.equal({
                        myKey: [
                            {
                                id: 123
                            },
                            {
                                id: 234
                            }
                        ]
                    });
                });
            });

            it('zips a field with one entry and two keys', () => {
                let returnObject = {
                    myKey: {
                        id: 123,
                        text: 'it works'
                    }
                };

                apiResponse(returnObject);

                return new SimpleVertecQuery().zip('myKey').get().then(response => {
                    expect(response.data).to.deep.equal({
                        myKey: [
                            {
                                id: 123,
                                text: 'it works'
                            }
                        ]
                    });
                });
            });

            it('zips a field with two entries and each with two keys', () => {
                let returnObject = {
                    myKey: {
                        id: [123, 234],
                        text: ['it', 'works']
                    }
                };

                apiResponse(returnObject);

                return new SimpleVertecQuery().zip('myKey').get().then(response => {
                    expect(response.data).to.deep.equal({
                        myKey: [
                            {
                                id: 123,
                                text: 'it'
                            },
                            {
                                id: 234,
                                text: 'works'
                            }
                        ]
                    });
                });
            });

            it('zips a field with two entries and each with two keys', () => {
                let returnObject = {
                    myKey: {
                        id: [123, 234],
                        text: ['it', 'works']
                    }
                };

                apiResponse(returnObject);

                return new SimpleVertecQuery().zip('myKey').get().then(response => {
                    expect(response.data).to.deep.equal({
                        myKey: [
                            {
                                id: 123,
                                text: 'it'
                            },
                            {
                                id: 234,
                                text: 'works'
                            }
                        ]
                    });
                });
            });

            it('uses force option to return an array for zipping a not existing field', () => {
                let returnObject = {
                    myFirstKey: {
                        id: [123, 234],
                        text: ['it', 'works']
                    }
                };

                apiResponse(returnObject);

                return new SimpleVertecQuery().zip('myFirstKey').zip('mySecondKey', null, true).get().then(response => {
                    expect(response.data).to.deep.equal({
                        myFirstKey: [
                            {
                                id: 123,
                                text: 'it'
                            },
                            {
                                id: 234,
                                text: 'works'
                            }
                        ],
                        mySecondKey: []
                    });
                });
            });

            it('uses key check option to return only elements which have a first element key value neither null of undefined', () => {
                let returnObject = {
                    myFirstKey: {
                        id: [null, 123],
                        text: ['it', 'does not work']
                    },
                    mySecondKey: {
                        id: [undefined, 234],
                        text: ['it', 'does not work']
                    },
                    myThirdKey: {
                        id: null,
                        text: 'it does not work'
                    },
                    myForthKey: {
                        id: undefined,
                        text: 'it does not work'
                    }
                };

                apiResponse(returnObject);

                return new SimpleVertecQuery()
                    .zip('myFirstKey', 'id')
                    .zip('mySecondKey', 'id')
                    .zip('myThirdKey', 'id')
                    .zip('myForthKey', 'id')
                    .get()
                    .then(response => {
                        expect(response.data).to.deep.equal({
                            myFirstKey: [],
                            mySecondKey: [],
                            myThirdKey: [],
                            myForthKey: []
                        });
                    });
            });

            it('zips field using a path', () => {
                let returnObject = {
                    my: {
                        key: {
                            id: [123, 234],
                            text: ['it', 'works']
                        },
                        not: {
                            my: 'key'
                        }
                    }
                };

                apiResponse(returnObject);

                return new SimpleVertecQuery().zip('my.key').get().then(response => {
                    expect(response.data).to.deep.equal({
                        my: {
                            key: [
                                {
                                    id: 123,
                                    text: 'it'
                                },
                                {
                                    id: 234,
                                    text: 'works'
                                }
                            ],
                            not: {
                                my: 'key'
                            }
                        }
                    });
                });
            });

            it('zips field using a path beginning with an wildcard', () => {
                let returnObject = {
                    first: {
                        myKey: {
                            id: [123, 234],
                            text: ['it', 'works']
                        },
                        not: {
                            my: 'key'
                        }
                    },
                    second: {
                        myKey: {
                            id: [345, 456],
                            text: ['it really', 'works!']
                        },
                        also: {
                            not: {
                                my: 'key'
                            }
                        }
                    }
                };

                apiResponse(returnObject);

                return new SimpleVertecQuery().zip('*.myKey').get().then(response => {
                    expect(response.data).to.deep.equal({
                        first: {
                            myKey: [
                                {
                                    id: 123,
                                    text: 'it'
                                },
                                {
                                    id: 234,
                                    text: 'works'
                                }
                            ],
                            not: {
                                my: 'key'
                            }
                        },
                        second: {
                            myKey: [
                                {
                                    id: 345,
                                    text: 'it really'
                                },
                                {
                                    id: 456,
                                    text: 'works!'
                                }
                            ],
                            also: {
                                not: {
                                    my: 'key'
                                }
                            }
                        }
                    });
                });
            });

            it('zips field using a path with one wildcard in the middle', () => {
                let returnObject = {
                    my: {
                        first: {
                            key: {
                                id: [123, 234],
                                text: ['it', 'works']
                            },
                            not: {
                                my: 'key'
                            }
                        },
                        second: {
                            key: {
                                id: [345, 456],
                                text: ['it really', 'works!']
                            },
                            also: {
                                not: {
                                    my: 'key'
                                }
                            }
                        }
                    }
                };

                apiResponse(returnObject);

                return new SimpleVertecQuery().zip('my.*.key').get().then(response => {
                    expect(response.data).to.deep.equal({
                        my: {
                            first: {
                                key: [
                                    {
                                        id: 123,
                                        text: 'it'
                                    },
                                    {
                                        id: 234,
                                        text: 'works'
                                    }
                                ],
                                not: {
                                    my: 'key'
                                }
                            },
                            second: {
                                key: [
                                    {
                                        id: 345,
                                        text: 'it really'
                                    },
                                    {
                                        id: 456,
                                        text: 'works!'
                                    }
                                ],
                                also: {
                                    not: {
                                        my: 'key'
                                    }
                                }
                            }
                        }
                    });
                });
            });

            it('zips field using a path with one wildcard in the middle, forcing to become an array', () => {
                let returnObject = {
                    my: {
                        first: {
                            key: {
                                id: 123,
                                text: 'it works'
                            },
                            not: {
                                my: 'key'
                            }
                        },
                        second: {
                            key: null,
                            also: {
                                not: {
                                    my: 'key'
                                }
                            }
                        }
                    }
                };

                apiResponse(returnObject);

                return new SimpleVertecQuery().zip('my.*.key').get().then(response => {
                    expect(response.data).to.deep.equal({
                        my: {
                            first: {
                                key: [
                                    {
                                        id: 123,
                                        text: 'it works'
                                    }
                                ],
                                not: {
                                    my: 'key'
                                }
                            },
                            second: {
                                key: [],
                                also: {
                                    not: {
                                        my: 'key'
                                    }
                                }
                            }
                        }
                    });
                });
            });

            it('zips field using a path ending with an wildcard', () => {
                let returnObject = {
                    myKey: {
                        first: {
                            id: [123, 234],
                            text: ['it', 'works']
                        },
                        second: {
                            id: [345, 456],
                            text: ['it really', 'works!']
                        }
                    }
                };

                apiResponse(returnObject);

                return new SimpleVertecQuery().zip('myKey.*').get().then(response => {
                    expect(response.data).to.deep.equal({
                        myKey: {
                            first: [
                                {
                                    id: 123,
                                    text: 'it'
                                },
                                {
                                    id: 234,
                                    text: 'works'
                                }
                            ],
                            second: [
                                {
                                    id: 345,
                                    text: 'it really'
                                },
                                {
                                    id: 456,
                                    text: 'works!'
                                }
                            ]
                        }
                    });
                });
            });

            it('zips multiple fields', () => {
                let returnObject = {
                    my: {
                        key: {
                            id: [123, 234],
                            text: ['it', 'works']
                        }
                    },
                    key: {
                        id: [123, 234],
                        text: ['it', 'works']
                    }
                };

                apiResponse(returnObject);

                return new SimpleVertecQuery().zip('my.key').zip('key').get().then(response => {
                    expect(response.data).to.deep.equal({
                        my: {
                            key: [
                                {
                                    id: 123,
                                    text: 'it'
                                },
                                {
                                    id: 234,
                                    text: 'works'
                                }
                            ]
                        },
                        key: [
                            {
                                id: 123,
                                text: 'it'
                            },
                            {
                                id: 234,
                                text: 'works'
                            }
                        ]
                    });
                });
            });

            it('adds zipping transformer at the end of the current transformer array to preserve user order', () => {
                let returnObject = {
                    my: {
                        key: {
                            text: ['it', 'works']
                        }
                    },
                    oldKey: {
                        id: [123, 234],
                        text: ['it', 'works']
                    }
                };

                apiResponse(returnObject);

                return new SimpleVertecQuery()
                    .addTransformer(response => {
                        response.my.key.id = [123, 234];

                        return response;
                    })
                    .zip('my.key')
                    .addTransformer(response => {
                        response.newKey = _.clone(response.oldKey);
                        delete response.oldKey;

                        return response;
                    })
                    .zip('newKey')
                    .addTransformer(response => {
                        response.newKey.push({
                            id: 345,
                            text: '!'
                        });

                        return response;
                    })
                    .get()
                    .then(response => {
                        expect(response.data).to.deep.equal({
                            my: {
                                key: [
                                    {
                                        id: 123,
                                        text: 'it'
                                    },
                                    {
                                        id: 234,
                                        text: 'works'
                                    }
                                ]
                            },
                            newKey: [
                                {
                                    id: 123,
                                    text: 'it'
                                },
                                {
                                    id: 234,
                                    text: 'works'
                                },
                                {
                                    id: 345,
                                    text: '!'
                                }
                            ]
                        });
                    });
            });

            it('does not zip a field using a path if the path does not exist, if force array option is false', () => {
                let returnObject = {
                    my: {
                        key: {
                            id: [123, 234],
                            text: ['it', 'works']
                        }
                    }
                };

                apiResponse(returnObject);

                return new SimpleVertecQuery().zip('my.key').zip('my.field', null, false).get().then(response => {
                    expect(response.data).to.deep.equal({
                        my: {
                            key: [
                                {
                                    id: 123,
                                    text: 'it'
                                },
                                {
                                    id: 234,
                                    text: 'works'
                                }
                            ]
                        }
                    });
                });
            });

            it('does not a touch a field if it has no keys', () => {
                let returnObject = {
                    myKey: 'it works'
                };

                apiResponse(returnObject);

                return new SimpleVertecQuery().zip('myKey').get().then(response => {
                    expect(response.data).to.deep.equal(returnObject);
                });
            });

            it('does nothing if a field does not exist', () => {
                let returnObject = {
                    myKey: 'it works'
                };

                apiResponse(returnObject);

                return new SimpleVertecQuery().zip('notMyKey').get().then(response => {
                    expect(response.data).to.deep.equal(returnObject);
                });
            });
        });
    });

    describe('cache testing', () => {
        describe('without cache access', () => {
            it('returns raw output of api if no cache is set', (done) => {
                SimpleVertecQuery.setCache(undefined);

                apiResponse({it: 'works 2'});

                new SimpleVertecQuery().get().then(response => {
                    expect(response.cacheDateTime).to.be.undefined;
                    expect(response.data.it).to.equal('works 2');
                    done();
                });
            });

            it('returns raw output of api if no cache ttl is set', (done) => {
                SimpleVertecQuery.setCache({});

                apiResponse({it: 'works 3'});

                new SimpleVertecQuery().get().then(response => {
                    expect(response.cacheDateTime).to.be.undefined;
                    expect(response.data.it).to.equal('works 3');
                    done();
                });
            });

            it('catches request errors', (done) => {
                sinon.stub(api, 'doRequest').callsFake(() => {
                    return new Promise((resolve, reject) => {
                        reject({Error1: 'Some error message'});
                    });
                });

                new SimpleVertecQuery().get().then(
                    (result) => {
                        throw new Error('Promise was unexpectedly fulfilled. Result: ' + JSON.stringify(result));
                    },
                    (error) => {
                        expect(error).to.include.keys('Error1');
                        done();
                    }
                );
            });
        });

        describe('with cache access', () => {
            let fakeCacheInstance;
            let cacheSetArguments;

            beforeEach('setup', () => {
                SimpleVertecQuery.setAppCacheKey('app');

                cacheSetArguments = [];
                fakeCacheInstance = {
                    get(cacheKey) {
                        return new Promise((resolve) => {
                            resolve(null);
                        });
                    },
                    set(cacheKey, cacheData, cacheDuration) {
                        cacheSetArguments.push(arguments);

                        return new Promise((resolve) => {
                            resolve();
                        });
                    }
                };
                SimpleVertecQuery.setCache(fakeCacheInstance);
            });

            it('uses general app cache key if no app cache key defined', (done, fail) => {
                SimpleVertecQuery.setAppCacheKey(undefined);

                sinon.stub(fakeCacheInstance, 'get').resolves('asd');

                apiResponse({it: 'works 14'});

                new SimpleVertecQuery().setCacheTTL(30).setCacheName('test10').setCacheKey('test20').get().then(response => {
                    expect(response.meta.onGrace).to.be.false;
                    expect(response.data.it).to.equal('works 14');
                    expect(response.meta.refresh).to.be.false;
                    expect(cacheSetArguments).to.have.lengthOf(1);
                    expect(cacheSetArguments[0][0]).to.equal('svq-test10-test20-30');
                    expect(cacheSetArguments[0][2]).to.equal(30000);
                    done();
                }).catch(err => done(err));
            });

            it('puts result into cache with ttl', (done) => {
                sinon.stub(fakeCacheInstance, 'get').resolves(null);

                apiResponse({it: 'works 4'});

                new SimpleVertecQuery().setCacheTTL(10).setCacheKey('test2').get().then(response => {
                    expect(response.meta.onGrace).to.be.false;
                    expect(response.data.it).to.equal('works 4');
                    expect(response.meta.refresh).to.be.false;
                    expect(cacheSetArguments).to.have.lengthOf(1);
                    expect(cacheSetArguments[0][0]).to.equal('app-test2-10');
                    expect(cacheSetArguments[0][2]).to.equal(10000);
                    done();
                }).catch(err => done(err));
            });

            it('puts result into cache with ttl and grace time which saves soft expire date into cache item', (done) => {
                sinon.stub(fakeCacheInstance, 'get').resolves(null);

                apiResponse({it: 'works 5'});

                new SimpleVertecQuery().setCacheTTL(10).setCacheGraceTime(5).setCacheKey('test3').get().then(response => {
                    expect(response.meta.onGrace).to.be.false;
                    expect(response.data.it).to.equal('works 5');
                    expect(response.meta.refresh).to.be.false;
                    expect(cacheSetArguments).to.have.lengthOf(1);
                    expect(cacheSetArguments[0][0]).to.equal('app-test3-10');
                    expect(cacheSetArguments[0][1].meta.softExpire).to.be.closeTo(newDate() + 10, 5);
                    expect(cacheSetArguments[0][2]).to.equal(15000);
                    done();
                }).catch(err => done(err));
            });

            it('fires request if no item in cache found and puts it into cache', (done) => {
                sinon.stub(fakeCacheInstance, 'get').resolves(null);

                apiResponse({it: 'works 6'});

                new SimpleVertecQuery().setCacheTTL(10).setCacheKey('test4').get().then(response => {
                    expect(response.meta.onGrace).to.be.false;
                    expect(response.data.it).to.equal('works 6');
                    expect(response.meta.refresh).to.be.false;
                    expect(cacheSetArguments).to.have.lengthOf(1);
                    expect(cacheSetArguments[0][0]).to.equal('app-test4-10');
                    done();
                }).catch(err => done(err));
            });

            it('puts result it into cache with request hash as cache key if no cacheKey defined', (done) => {
                sinon.stub(fakeCacheInstance, 'get').resolves(null);
                let buildXmlSpy = sinon.spy(api, 'buildXml');

                apiResponse({it: 'works 7'});

                new SimpleVertecQuery().setCacheTTL(10).get().then(response => {
                    expect(response.meta.onGrace).to.be.false;
                    expect(response.data.it).to.equal('works 7');
                    expect(response.meta.refresh).to.be.false;
                    expect(cacheSetArguments).to.have.lengthOf(1);
                    expect(cacheSetArguments[0][0]).to.match(/^app-\w{32}-10$/);
                    expect(buildXmlSpy.returnValues).to.have.lengthOf(2);
                    done();
                }).catch(err => done(err));
            });

            it('puts result it into cache with cacheName, and request hash as cache key if no cacheKey defined', (done) => {
                sinon.stub(fakeCacheInstance, 'get').resolves(null);
                let buildXmlSpy = sinon.spy(api, 'buildXml');

                apiResponse({it: 'works 7'});

                new SimpleVertecQuery().setCacheTTL(10).setCacheName('test10').get().then(response => {
                    expect(response.meta.onGrace).to.be.false;
                    expect(response.data.it).to.equal('works 7');
                    expect(response.meta.refresh).to.be.false;
                    expect(cacheSetArguments).to.have.lengthOf(1);
                    expect(cacheSetArguments[0][0]).to.match(/^app-test10-\w{32}-10$/);
                    expect(buildXmlSpy.returnValues).to.have.lengthOf(2);
                    done();
                }).catch(err => done(err));
            });

            it('fires request if item in cache is on grace', (done) => {
                let cacheItem = {
                    meta: {
                        softExpire: newDate() - 1
                    },
                    data: {it: 'works 9'}
                };
                sinon.stub(fakeCacheInstance, 'get').resolves(cacheItem);

                apiResponse({it: 'works 12'});

                new SimpleVertecQuery().setCacheTTL(10).setCacheGraceTime(5).setCacheKey('test6').get().then(response => {
                    expect(response.meta.onGrace).to.be.true;
                    expect(response.data.it).to.equal('works 9');
                    expect(response.meta.refresh).to.be.false;

                    setTimeout(() => {
                        expect(cacheSetArguments).to.have.lengthOf(1);
                        expect(cacheSetArguments[0][0]).to.equal('app-test6-10');
                        expect(cacheSetArguments[0][1].data.it).to.equal('works 12');
                        done();
                    }, 10);
                }).catch(err => done(err));
            });

            it('does not fire request if item in cache found without grace', (done) => {
                let cacheItem = {
                    meta: {
                        softExpire: 0
                    },
                    data: {it: 'works 8'}
                };
                sinon.stub(fakeCacheInstance, 'get').resolves(cacheItem);

                new SimpleVertecQuery().setCacheTTL(10).setCacheKey('test5').get().then(response => {
                    expect(response.meta.onGrace).to.be.false;
                    expect(response.data.it).to.equal('works 8');
                    expect(response.meta.refresh).to.be.false;
                    expect(cacheSetArguments).to.have.lengthOf(0);
                    done();
                }).catch(err => done(err));
            });

            it('does not fire request if item in cache found which could be on grace but is not', (done) => {
                let cacheItem = {
                    meta: {
                        softExpire: newDate() + 1
                    },
                    data: {it: 'works 10'}
                };
                sinon.stub(fakeCacheInstance, 'get').resolves(cacheItem);

                new SimpleVertecQuery().setCacheTTL(10).setCacheGraceTime(5).setCacheKey('test7').get().then(response => {
                    expect(response.meta.onGrace).to.be.false;
                    expect(response.data.it).to.equal('works 10');
                    expect(response.meta.refresh).to.be.false;
                    expect(cacheSetArguments).to.have.lengthOf(0);
                    done();
                }).catch(err => done(err));
            });

            it('fires request if refresh = true even if item in cache found', (done) => {
                let cacheItem = {
                    meta: {
                        softExpire: newDate() - 1
                    },
                    data: {it: 'works 11'}
                };
                sinon.stub(fakeCacheInstance, 'get').resolves(cacheItem);

                apiResponse({it: 'works 13'});

                new SimpleVertecQuery().setCacheTTL(10).setCacheGraceTime(5).setCacheKey('test8').get(true).then(response => {
                    expect(response.meta.onGrace).to.be.false;
                    expect(response.data.it).to.equal('works 13');
                    expect(response.meta.refresh).to.be.true;
                    expect(cacheSetArguments).to.have.lengthOf(1);
                    expect(cacheSetArguments[0][0]).to.equal('app-test8-10');
                    done();
                }).catch(err => done(err));
            });

            it('catches cache fetching errors', (done) => {
                sinon.stub(fakeCacheInstance, 'get').rejects({Error2: 'Some error message'});

                new SimpleVertecQuery().setCacheTTL(10).get().then(result => {
                    done('Promise was unexpectedly fulfilled. Result: ' + JSON.stringify(result));
                }).catch(error => {
                    expect(error).to.include.keys('Error2');
                    done();
                });
            });

            it('catches request errors', (done) => {
                sinon.stub(fakeCacheInstance, 'get').resolves(null);

                sinon.stub(api, 'doRequest').callsFake(() => {
                    return new Promise((resolve, reject) => {
                        reject({Error3: 'Some error message'});
                    });
                });

                new SimpleVertecQuery().setCacheTTL(10).setCacheKey('test9').get().then(result => {
                    done('Promise was unexpectedly fulfilled. Result: ' + JSON.stringify(result));
                }).catch(error => {
                    expect(error).to.include.keys('Error3');
                    done();
                });
            });

            it('logs error when grace period background refresh fails', (done) => {
                let cacheItem = {
                    meta: {
                        softExpire: newDate() - 1
                    },
                    data: {it: 'stale data'}
                };
                sinon.stub(fakeCacheInstance, 'get').resolves(cacheItem);

                sinon.stub(api, 'doRequest').callsFake(() => {
                    return new Promise((resolve, reject) => {
                        reject(new Error('background refresh failed'));
                    });
                });

                let consoleErrorStub = sinon.stub(console, 'error');

                new SimpleVertecQuery().setCacheTTL(10).setCacheGraceTime(5).setCacheKey('test-grace-err').get().then(response => {
                    // Should still resolve with stale data
                    expect(response.meta.onGrace).to.be.true;
                    expect(response.data.it).to.equal('stale data');

                    setTimeout(() => {
                        expect(consoleErrorStub.calledOnce).to.be.true;
                        expect(consoleErrorStub.firstCall.args[0]).to.include('Grace period refresh error');
                        consoleErrorStub.restore();
                        done();
                    }, 10);
                }).catch(err => {
                    consoleErrorStub.restore();
                    done(err);
                });
            });

            it('catches cache set errors', (done) => {
                sinon.stub(fakeCacheInstance, 'get').resolves(null);
                sinon.stub(fakeCacheInstance, 'set').rejects({Error4: 'Cache write failed'});

                apiResponse({it: 'works cache-set-error'});

                new SimpleVertecQuery().setCacheTTL(10).setCacheKey('test-set-err').get().then(result => {
                    done('Promise was unexpectedly fulfilled. Result: ' + JSON.stringify(result));
                }).catch(error => {
                    expect(error).to.include.keys('Error4');
                    done();
                });
            });

            it('uses cacheName in cache key generation with cacheKey', (done) => {
                sinon.stub(fakeCacheInstance, 'get').resolves(null);

                apiResponse({it: 'works cache-name'});

                new SimpleVertecQuery().setCacheTTL(20).setCacheName('mySection').setCacheKey('myKey').get().then(response => {
                    expect(cacheSetArguments).to.have.lengthOf(1);
                    expect(cacheSetArguments[0][0]).to.equal('app-mySection-myKey-20');
                    done();
                }).catch(err => done(err));
            });
        });
    });

    describe('slow lane', () => {
        it('usingSlowLane() sets slowLane option', () => {
            let query = new SimpleVertecQuery();
            expect(query.options.slowLane).to.be.false;

            query.usingSlowLane();
            expect(query.options.slowLane).to.be.true;
        });

        it('usingSlowLane(false) disables slow lane', () => {
            let query = new SimpleVertecQuery().usingSlowLane();
            expect(query.options.slowLane).to.be.true;

            query.usingSlowLane(false);
            expect(query.options.slowLane).to.be.false;
        });

        it('slowLane via constructor overwriteOptions', () => {
            let query = new SimpleVertecQuery({ slowLane: true });
            expect(query.options.slowLane).to.be.true;
        });

        it('slowLane flag is passed through to api.select()', () => {
            let selectSpy = sinon.spy(api, 'select');

            sinon.stub(api, 'doRequest').callsFake(() => {
                return Promise.resolve({it: 'works'});
            });

            return new SimpleVertecQuery()
                .whereOcl('Projektbearbeiter')
                .addFields('name')
                .usingSlowLane()
                .get()
                .then(() => {
                    expect(selectSpy.calledOnce).to.be.true;
                    let lastArg = selectSpy.firstCall.args[selectSpy.firstCall.args.length - 1];
                    expect(lastArg).to.deep.equal({ slowLane: true });
                });
        });

        it('does not pass slowLane option when not set', () => {
            let selectSpy = sinon.spy(api, 'select');

            sinon.stub(api, 'doRequest').callsFake(() => {
                return Promise.resolve({it: 'works'});
            });

            return new SimpleVertecQuery()
                .whereOcl('Projektbearbeiter')
                .addFields('name')
                .get()
                .then(() => {
                    expect(selectSpy.calledOnce).to.be.true;
                    // Should only have 3 args: query, params, fields (no requestOptions)
                    expect(selectSpy.firstCall.args.length).to.equal(3);
                });
        });
    });
});
