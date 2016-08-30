import {SimpleVertecApi, SimpleVertecQuery} from '../lib/index';
import {expect} from 'chai';
import sinon from 'sinon';
import q from 'bluebird';
import _ from 'lodash';

describe('SimpleVertecQuery', () => {
    let api;
    let buildSelectObjectSpy;

    let apiResponse = obj => {
        sinon.stub(api, 'doRequest', () => {
            return new q((resolve) => {
                resolve(obj);
            });
        });
    };

    beforeEach('suite setup', () => {
        api = new SimpleVertecApi('http://localhost', 'my-username', 'my-password');
        buildSelectObjectSpy = sinon.spy(api, 'buildSelectObject');

        SimpleVertecQuery.setApi(api);
    });

    describe('some basics', () => {
        it('sets default api', () => {
            expect(SimpleVertecQuery.api).to.equal(api);
        });

        it('sets cache instance', () => {
            let fakeCache = {};
            SimpleVertecQuery.setMemcached(fakeCache);

            expect(SimpleVertecQuery.cache).to.equal(fakeCache);
        });

        it('sets app cache key', () => {
            let appCacheKey = 'my-app';
            SimpleVertecQuery.setAppCacheKey(appCacheKey);

            expect(SimpleVertecQuery.appCacheKey).to.equal(appCacheKey);
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

        it('setCacheTTL() sets ttl for cache objects', () => {
            let query = new SimpleVertecQuery().setCacheTTL(10);
            expect(query.options.cacheTTL).to.equal(10);
        });

        it('setCacheGraceTime() sets grace time for cache objects', () => {
            let query = new SimpleVertecQuery().setCacheGraceTime(10);
            expect(query.options.cacheGraceTime).to.equal(10);
        });

        it('inParallel() sets parallel mode', () => {
            let query = new SimpleVertecQuery();
            expect(query.options.useParallelMode).to.equal(false);

            query.inParallel();
            expect(query.options.useParallelMode).to.equal(true);

            query.inParallel(false);
            expect(query.options.useParallelMode).to.equal(false);
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

            it('makes multiple requests with multiple objrefs when using inParallel()', () => {
                let firstReturnObject = {myFirstKey: {it: 'works'}};
                let secondReturnObject = {mySecondKey: {it: 'works'}};

                api.doRequest.restore();
                let requestStub = sinon.stub(api, 'doRequest');
                requestStub.onFirstCall().returns(q.resolve(firstReturnObject));
                requestStub.onSecondCall().returns(q.resolve(secondReturnObject));

                return new SimpleVertecQuery().findById([123, 234]).addField('code').inParallel().get().then(response => {
                    expect(response[0].data).to.deep.equal(firstReturnObject);
                    expect(response[1].data).to.deep.equal(secondReturnObject);

                    expect(buildSelectObjectSpy.returnValues.shift()).to.deep.equal({
                        Query: {
                            Resultdef: {
                                expression: [],
                                member: ['code']
                            },
                            Selection: {
                                objref: 123
                            }
                        }
                    });

                    expect(buildSelectObjectSpy.returnValues.shift()).to.deep.equal({
                        Query: {
                            Resultdef: {
                                expression: [],
                                member: ['code']
                            },
                            Selection: {
                                objref: 234
                            }
                        }
                    });
                });
            });

            it('makes multiple requests with multiple objrefs when using inParallel() and uses refresh', () => {
                let firstReturnObject = {myFirstKey: {it: 'works'}};
                let secondReturnObject = {mySecondKey: {it: 'works'}};

                let requestStub = sinon.stub(api, 'select');
                requestStub.onFirstCall().returns(q.resolve(firstReturnObject));
                requestStub.onSecondCall().returns(q.resolve(secondReturnObject));

                let cacheSetArguments = [];
                let fakeCacheInstance = {
                    get() {},
                    set() {
                        cacheSetArguments.push(arguments);
                    }
                };
                SimpleVertecQuery.setMemcached(fakeCacheInstance);
                sinon.stub(fakeCacheInstance, 'get').yields(null, false);

                return new SimpleVertecQuery().findById([123, 234]).setCacheTTL(10).inParallel().get(true).then(response => {
                    expect(response[0].data).to.deep.equal(firstReturnObject);
                    expect(response[1].data).to.deep.equal(secondReturnObject);

                    expect(response[0].refresh).to.be.true;
                    expect(response[1].refresh).to.be.true;
                });
            });

            it('returns same response structure like when using inParallel() even with only one id in an array', () => {
                let returnObject = {myKey: {it: 'works'}};

                api.doRequest.restore();
                apiResponse(returnObject);

                return new SimpleVertecQuery().findById([123]).inParallel().get().then(response => {
                    expect(response).to.have.lengthOf(1);
                    expect(response[0].data).to.deep.equal(returnObject);
                });
            });

            it('returns same response structure like when using inParallel() even with only objref = id', () => {
                let returnObject = {myKey: {it: 'works'}};

                api.doRequest.restore();
                apiResponse(returnObject);

                return new SimpleVertecQuery().findById(123).inParallel().get().then(response => {
                    expect(response).to.have.lengthOf(1);
                    expect(response[0].data).to.deep.equal(returnObject);
                });
            });

            it('uses same transformers and fields and params on multiple requests', () => {
                let i = 0;

                return new SimpleVertecQuery()
                    .findById([123, 234])
                    .addField(':dynamicField')
                    .addParam({dynamicField: 'code'})
                    .inParallel()
                    .addTransformer(response => {
                        i++;

                        return {
                            myKey: {
                                it: response.it + '!' + i
                            }
                        };
                    })
                    .get()
                    .then(response => {
                        expect(response).to.have.lengthOf(2);
                        expect(response[0].data).to.deep.equal({myKey: {it: 'works!1'}});
                        expect(response[1].data).to.deep.equal({myKey: {it: 'works!2'}});

                        expect(buildSelectObjectSpy.returnValues.shift()).to.deep.equal({
                            Query: {
                                Resultdef: {
                                    expression: [],
                                    member: ['code']
                                },
                                Selection: {
                                    objref: 123
                                }
                            }
                        });

                        expect(buildSelectObjectSpy.returnValues.shift()).to.deep.equal({
                            Query: {
                                Resultdef: {
                                    expression: [],
                                    member: ['code']
                                },
                                Selection: {
                                    objref: 234
                                }
                            }
                        });
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
                expect(response.data).to.deep.equal(undefined);
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

            it('zips field using a path with two wildcards in the middle', () => {
                let returnObject = {
                    my: {
                        first: {
                            subFirst: {
                                key: {
                                    id: [123, 234],
                                    text: ['it', 'works']
                                },
                                not: {
                                    my: 'key'
                                }
                            },
                            subSecond: {
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
                        },
                        second: {
                            subFirst: {
                                key: {
                                    id: [567, 678],
                                    text: ['it', 'works']
                                },
                                not: {
                                    my: 'key'
                                }
                            },
                            subSecond: {
                                key: {
                                    id: [789, 890],
                                    text: ['it really', 'works!']
                                },
                                also: {
                                    not: {
                                        my: 'key'
                                    }
                                }
                            }
                        }
                    }
                };

                apiResponse(returnObject);

                return new SimpleVertecQuery().zip('my.*.*.key').get().then(response => {
                    expect(response.data).to.deep.equal({
                        my: {
                            first: {
                                subFirst: {
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
                                subSecond: {
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
                            },
                            second: {
                                subFirst: {
                                    key: [
                                        {
                                            id: 567,
                                            text: 'it'
                                        },
                                        {
                                            id: 678,
                                            text: 'works'
                                        }
                                    ],
                                    not: {
                                        my: 'key'
                                    }
                                },
                                subSecond: {
                                    key: [
                                        {
                                            id: 789,
                                            text: 'it really'
                                        },
                                        {
                                            id: 890,
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

            it('does not zip a field using a path if the path does not exist', () => {
                let returnObject = {
                    my: {
                        key: {
                            id: [123, 234],
                            text: ['it', 'works']
                        }
                    }
                };

                apiResponse(returnObject);

                return new SimpleVertecQuery().zip('my.key').zip('my.field').get().then(response => {
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
                SimpleVertecQuery.setMemcached(undefined);

                apiResponse({it: 'works 2'});

                new SimpleVertecQuery().get().then(response => {
                    expect(response.cacheDateTime).to.be.undefined;
                    expect(response.data.it).to.equal('works 2');
                    done();
                });
            });

            it('returns raw output of api if no cache ttl is set', (done) => {
                SimpleVertecQuery.setMemcached({});

                apiResponse({it: 'works 3'});

                new SimpleVertecQuery().get().then(response => {
                    expect(response.cacheDateTime).to.be.undefined;
                    expect(response.data.it).to.equal('works 3');
                    done();
                });
            });

            it('catches request errors', (done) => {
                sinon.stub(api, 'doRequest', () => {
                    return new q((resolve, reject) => {
                        reject({ Error1: 'Some error message' });
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
                    get() {},
                    set() {
                        cacheSetArguments.push(arguments);
                    }
                };
                SimpleVertecQuery.setMemcached(fakeCacheInstance);
            });

            it('uses general app cache key if no app cache key defined', (done) => {
                SimpleVertecQuery.setAppCacheKey(undefined);

                sinon.stub(fakeCacheInstance, 'get').yields(null, false);

                apiResponse({it: 'works 14'});

                new SimpleVertecQuery().setCacheTTL(10).setCacheKey('test10').get().then(response => {
                    expect(response.onGrace).to.be.false;
                    expect(response.data.it).to.equal('works 14');
                    expect(response.refresh).to.be.false;
                    expect(cacheSetArguments).to.have.lengthOf(1);
                    expect(cacheSetArguments[0][0]).to.equal('svq-test10-10');
                    expect(cacheSetArguments[0][2]).to.equal(10);
                    done();
                });
            });

            it('puts result into cache with ttl', (done) => {
                sinon.stub(fakeCacheInstance, 'get').yields(null, false);

                apiResponse({it: 'works 4'});

                new SimpleVertecQuery().setCacheTTL(10).setCacheKey('test2').get().then(response => {
                    expect(response.onGrace).to.be.false;
                    expect(response.data.it).to.equal('works 4');
                    expect(response.refresh).to.be.false;
                    expect(cacheSetArguments).to.have.lengthOf(1);
                    expect(cacheSetArguments[0][0]).to.equal('app-test2-10');
                    expect(cacheSetArguments[0][2]).to.equal(10);
                    done();
                });
            });

            it('puts result into cache with ttl and grace time which saves soft expire date into cache item', (done) => {
                sinon.stub(fakeCacheInstance, 'get').yields(null, false);

                apiResponse({it: 'works 5'});

                new SimpleVertecQuery().setCacheTTL(10).setCacheGraceTime(5).setCacheKey('test3').get().then(response => {
                    expect(response.onGrace).to.be.false;
                    expect(response.data.it).to.equal('works 5');
                    expect(response.refresh).to.be.false;
                    expect(cacheSetArguments).to.have.lengthOf(1);
                    expect(cacheSetArguments[0][0]).to.equal('app-test3-10');
                    expect(cacheSetArguments[0][1].softExpire).to.be.closeTo(new Date().getTime() + 10*1000, 500);
                    expect(cacheSetArguments[0][2]).to.equal(15);
                    done();
                });
            });

            it('fires request if no item in cache found and puts it into cache', (done) => {
                sinon.stub(fakeCacheInstance, 'get').yields(null, false);

                apiResponse({it: 'works 6'});

                new SimpleVertecQuery().setCacheTTL(10).setCacheKey('test4').get().then(response => {
                    expect(response.onGrace).to.be.false;
                    expect(response.data.it).to.equal('works 6');
                    expect(response.refresh).to.be.false;
                    expect(cacheSetArguments).to.have.lengthOf(1);
                    expect(cacheSetArguments[0][0]).to.equal('app-test4-10');
                    done();
                });
            });

            it('puts result it into cache with request hash as cache key if no cacheKey defined', (done) => {
                sinon.stub(fakeCacheInstance, 'get').yields(null, false);
                let buildSelectStringSpy = sinon.spy(api, 'buildSelectString');

                apiResponse({it: 'works 7'});

                new SimpleVertecQuery().setCacheTTL(10).get().then(response => {
                    expect(response.onGrace).to.be.false;
                    expect(response.data.it).to.equal('works 7');
                    expect(response.refresh).to.be.false;
                    expect(cacheSetArguments).to.have.lengthOf(1);
                    expect(cacheSetArguments[0][0]).to.match(/^app-\w{32}-10$/);
                    expect(buildSelectStringSpy.returnValues).to.have.lengthOf(2);
                    done();
                });
            });

            it('fires request if item in cache is on grace', (done) => {
                let cacheItem = {
                    softExpire: new Date().getTime() - 1000,
                    data: {it: 'works 9'}
                };
                sinon.stub(fakeCacheInstance, 'get').yields(null, cacheItem);

                apiResponse({it: 'works 12'});

                new SimpleVertecQuery().setCacheTTL(10).setCacheGraceTime(5).setCacheKey('test6').get().then(response => {
                    expect(response.onGrace).to.be.true;
                    expect(response.data.it).to.equal('works 9');
                    expect(response.refresh).to.be.false;

                    setTimeout(() => {
                        expect(cacheSetArguments).to.have.lengthOf(1);
                        expect(cacheSetArguments[0][0]).to.equal('app-test6-10');
                        expect(cacheSetArguments[0][1].data.it).to.equal('works 12');
                        done();
                    }, 10);
                });
            });

            it('does not fire request if item in cache found without grace', (done) => {
                let cacheItem = {
                    softExpire: 0,
                    data: {it: 'works 8'}
                };
                sinon.stub(fakeCacheInstance, 'get').yields(null, cacheItem);

                new SimpleVertecQuery().setCacheTTL(10).setCacheKey('test5').get().then(response => {
                    expect(response.onGrace).to.be.false;
                    expect(response.data.it).to.equal('works 8');
                    expect(response.refresh).to.be.false;
                    expect(cacheSetArguments).to.have.lengthOf(0);
                    done();
                });
            });

            it('does not fire request if item in cache found which could be on grace but is not', (done) => {
                let cacheItem = {
                    softExpire: new Date().getTime() + 1000,
                    data: {it: 'works 10'}
                };
                sinon.stub(fakeCacheInstance, 'get').yields(null, cacheItem);

                new SimpleVertecQuery().setCacheTTL(10).setCacheGraceTime(5).setCacheKey('test7').get().then(response => {
                    expect(response.onGrace).to.be.false;
                    expect(response.data.it).to.equal('works 10');
                    expect(response.refresh).to.be.false;
                    expect(cacheSetArguments).to.have.lengthOf(0);
                    done();
                });
            });

            it('fires request if refresh = true even if item in cache found', (done) => {
                let cacheItem = {
                    softExpire: new Date().getTime() - 1000,
                    data: {it: 'works 11'}
                };
                sinon.stub(fakeCacheInstance, 'get').yields(null, cacheItem);

                apiResponse({it: 'works 13'});

                new SimpleVertecQuery().setCacheTTL(10).setCacheGraceTime(5).setCacheKey('test8').get(true).then(response => {
                    expect(response.onGrace).to.be.false;
                    expect(response.data.it).to.equal('works 13');
                    expect(response.refresh).to.be.true;
                    expect(cacheSetArguments).to.have.lengthOf(1);
                    expect(cacheSetArguments[0][0]).to.equal('app-test8-10');
                    done();
                });
            });

            it('sets caching independently for every request', () => {
                sinon.stub(fakeCacheInstance, 'get').yields(null, false);

                let firstReturnObject = {myFirstKey: {it: 'works'}};
                let secondReturnObject = {mySecondKey: {it: 'works'}};

                let requestStub = sinon.stub(api, 'select');
                requestStub.onFirstCall().returns(q.resolve(firstReturnObject));
                requestStub.onSecondCall().returns(q.resolve(secondReturnObject));

                return new SimpleVertecQuery()
                    .findById([123, 234])
                    .setCacheTTL(10)
                    .setCacheGraceTime(5)
                    .inParallel()
                    .get()
                    .then(response => {
                        expect(response[0].data).to.deep.equal(firstReturnObject);
                        expect(response[1].data).to.deep.equal(secondReturnObject);
                        expect(response[0].softExpire).to.not.equal(response[1].softExpire);
                        expect(cacheSetArguments).to.have.lengthOf(2);
                        expect(cacheSetArguments[0][1].softExpire).to.be.closeTo(new Date().getTime() + 10*1000, 500);
                        expect(cacheSetArguments[1][1].softExpire).to.be.closeTo(new Date().getTime() + 10*1000, 500);
                    });
            });

            it('returns cached object and requests uncached object', () => {
                let firstReturnObject = {
                    data: {
                        myFirstKey: {it: 'works'}
                    },
                    softExpire: new Date().getTime() + 1000
                };
                let secondReturnObject = {mySecondKey: {it: 'works'}};

                let cacheStub = sinon.stub(fakeCacheInstance, 'get');
                cacheStub.onFirstCall().yields(null, firstReturnObject);
                cacheStub.onSecondCall().yields(null, false);

                let requestStub = sinon.stub(api, 'doRequest');
                requestStub.returns(q.resolve(secondReturnObject));

                let selectSpy = sinon.spy(api, 'select');

                return new SimpleVertecQuery()
                    .findById([123, 234])
                    .setCacheTTL(10)
                    .setCacheGraceTime(5)
                    .inParallel()
                    .get()
                    .then(response => {
                        expect(response[0].data).to.deep.equal(firstReturnObject.data);
                        expect(response[1].data).to.deep.equal(secondReturnObject);
                        expect(cacheSetArguments).to.have.lengthOf(1);
                        expect(cacheSetArguments[0][1].softExpire).to.be.closeTo(new Date().getTime() + 10*1000, 500);
                        sinon.assert.calledOnce(selectSpy);
                    });
            });

            it('catches cache fetching errors', (done) => {
                sinon.stub(fakeCacheInstance, 'get').yields({ Error2: 'Some error message' }, null);

                new SimpleVertecQuery().setCacheTTL(10).get().then(
                    (result) => {
                        throw new Error('Promise was unexpectedly fulfilled. Result: ' + JSON.stringify(result));
                    },
                    (error) => {
                        expect(error).to.include.keys('Error2');
                        done();
                    }
                );
            });

            it('catches request errors', (done) => {
                sinon.stub(fakeCacheInstance, 'get').yields(null, null);

                sinon.stub(api, 'doRequest', () => {
                    return new q((resolve, reject) => {
                        reject({ Error3: 'Some error message' });
                    });
                });

                new SimpleVertecQuery().setCacheTTL(10).setCacheKey('test9').get().then(
                    (result) => {
                        throw new Error('Promise was unexpectedly fulfilled. Result: ' + JSON.stringify(result));
                    },
                    (error) => {
                        expect(error).to.include.keys('Error3');
                        done();
                    }
                );
            });
        });
    });
});
