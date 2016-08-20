import {SimpleVertecApi, SimpleVertecQuery} from '../lib/index';
import {expect} from 'chai';
import sinon from 'sinon';
import q from 'bluebird';

describe('SimpleVertecQuery', () => {
    let api;
    let buildSelectObjectSpy;

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
            sinon.stub(api, 'doRequest', () => {
                return new q((resolve) => {
                    resolve({it: 'works'});
                });
            });
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
            expect(query.cacheKey).to.equal('test1');
        });

        it('setCacheTTL() sets ttl for cache objects', () => {
            let query = new SimpleVertecQuery().setCacheTTL(10);
            expect(query.cacheTTL).to.equal(10);
        });

        it('setCacheGraceTime() sets grace time for cache objects', () => {
            let query = new SimpleVertecQuery().setCacheGraceTime(10);
            expect(query.cacheGraceTime).to.equal(10);
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

            sinon.stub(api, 'select', () => {
                return new q((resolve) => {
                    resolve(returnObject);
                });
            });

            new SimpleVertecQuery().get().then(response => {
                expect(response.data).to.deep.equal(returnObject);
                done();
            });
        });

        it('adds one transformer', (done) => {
            let returnObject = {data: '123'};

            sinon.stub(api, 'select', () => {
                return new q((resolve) => {
                    resolve(returnObject);
                });
            });

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

            sinon.stub(api, 'select', () => {
                return new q((resolve) => {
                    resolve(returnObject);
                });
            });

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

            sinon.stub(api, 'select', () => {
                return new q((resolve) => {
                    resolve(returnObject);
                });
            });

            new SimpleVertecQuery().filterProperty('myKey').get().then(response => {
                expect(response.data).to.deep.equal({it: 'works'});
                done();
            });
        });

        it('uses a property filter with not existing property', (done) => {
            let returnObject = {myKey: {it: 'works'}};

            sinon.stub(api, 'select', () => {
                return new q((resolve) => {
                    resolve(returnObject);
                });
            });

            new SimpleVertecQuery().filterProperty('myNotExistingKey').get().then(response => {
                expect(response.data).to.deep.equal(undefined);
                done();
            });
        });

        it('uses a property filter with array transformation', (done) => {
            let returnObject = {myKey: {it: 'works'}};

            sinon.stub(api, 'select', () => {
                return new q((resolve) => {
                    resolve(returnObject);
                });
            });

            new SimpleVertecQuery().filterProperty('myKey', true).get().then(response => {
                expect(response.data).to.deep.equal([{it: 'works'}]);
                done();
            });
        });

        it('uses a property filter with array transformation on an array', (done) => {
            let returnObject = {myKey: [{it: 'works'}]};

            sinon.stub(api, 'select', () => {
                return new q((resolve) => {
                    resolve(returnObject);
                });
            });

            new SimpleVertecQuery().filterProperty('myKey', true).get().then(response => {
                expect(response.data).to.deep.equal([{it: 'works'}]);
                done();
            });
        });

        it('uses a property filter with array transformation on an not existing key', (done) => {
            let returnObject = {myKey: {it: 'works'}};

            sinon.stub(api, 'select', () => {
                return new q((resolve) => {
                    resolve(returnObject);
                });
            });

            new SimpleVertecQuery().filterProperty('myNotExistingKey', true).get().then(response => {
                expect(response.data).to.deep.equal([]);
                done();
            });
        });

        it('uses a property filter and multiple transformers all generating new return arrays', () => {
            let returnObject = {myKey: {it: 'works', data1: '123'}, should: {be: 'filtered'}};

            sinon.stub(api, 'select', () => {
                return new q((resolve) => {
                    resolve(returnObject);
                });
            });

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
    });

    describe('cache testing', () => {
        describe('without cache access', () => {
            it('returns raw output of api if no cache is set', (done) => {
                SimpleVertecQuery.setMemcached(undefined);

                sinon.stub(api, 'select', () => {
                    return new q((resolve) => {
                        resolve({it: 'works 2'});
                    });
                });

                new SimpleVertecQuery().get().then(response => {
                    expect(response.cacheDateTime).to.be.undefined;
                    expect(response.data.it).to.equal('works 2');
                    done();
                });
            });

            it('returns raw output of api if no cache ttl is set', (done) => {
                SimpleVertecQuery.setMemcached({});

                sinon.stub(api, 'select', () => {
                    return new q((resolve) => {
                        resolve({it: 'works 3'});
                    });
                });

                new SimpleVertecQuery().get().then(response => {
                    expect(response.cacheDateTime).to.be.undefined;
                    expect(response.data.it).to.equal('works 3');
                    done();
                });
            });

            it('catches request errors', (done) => {
                sinon.stub(api, 'select', () => {
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
                        cacheSetArguments = arguments;
                    }
                };
                SimpleVertecQuery.setMemcached(fakeCacheInstance);
            });

            it('uses general app cache key if no app cache key defined', (done) => {
                SimpleVertecQuery.setAppCacheKey(undefined);

                sinon.stub(fakeCacheInstance, 'get').yields(null, false);

                sinon.stub(api, 'select', () => {
                    return new q((resolve) => {
                        resolve({it: 'works 14'});
                    });
                });

                new SimpleVertecQuery().setCacheTTL(10).setCacheKey('test10').get().then(response => {
                    expect(response.onGrace).to.be.false;
                    expect(response.data.it).to.equal('works 14');
                    expect(response.refresh).to.be.false;
                    expect(cacheSetArguments[0]).to.equal('svq-test10-10');
                    expect(cacheSetArguments[2]).to.equal(10);
                    done();
                });
            });

            it('puts result into cache with ttl', (done) => {
                sinon.stub(fakeCacheInstance, 'get').yields(null, false);

                sinon.stub(api, 'select', () => {
                    return new q((resolve) => {
                        resolve({it: 'works 4'});
                    });
                });

                new SimpleVertecQuery().setCacheTTL(10).setCacheKey('test2').get().then(response => {
                    expect(response.onGrace).to.be.false;
                    expect(response.data.it).to.equal('works 4');
                    expect(response.refresh).to.be.false;
                    expect(cacheSetArguments[0]).to.equal('app-test2-10');
                    expect(cacheSetArguments[2]).to.equal(10);
                    done();
                });
            });

            it('puts result into cache with ttl and grace time which saves soft expire date into cache item', (done) => {
                sinon.stub(fakeCacheInstance, 'get').yields(null, false);

                sinon.stub(api, 'select', () => {
                    return new q((resolve) => {
                        resolve({it: 'works 5'});
                    });
                });

                new SimpleVertecQuery().setCacheTTL(10).setCacheGraceTime(5).setCacheKey('test3').get().then(response => {
                    expect(response.onGrace).to.be.false;
                    expect(response.data.it).to.equal('works 5');
                    expect(response.refresh).to.be.false;
                    expect(cacheSetArguments[0]).to.equal('app-test3-10');
                    expect(cacheSetArguments[1].softExpire).to.be.closeTo(new Date().getTime() + 10*1000, 500);
                    expect(cacheSetArguments[2]).to.equal(15);
                    done();
                });
            });

            it('fires request if no item in cache found and puts it into cache', (done) => {
                sinon.stub(fakeCacheInstance, 'get').yields(null, false);

                sinon.stub(api, 'select', () => {
                    return new q((resolve) => {
                        resolve({it: 'works 6'});
                    });
                });

                new SimpleVertecQuery().setCacheTTL(10).setCacheKey('test4').get().then(response => {
                    expect(response.onGrace).to.be.false;
                    expect(response.data.it).to.equal('works 6');
                    expect(response.refresh).to.be.false;
                    expect(cacheSetArguments[0]).to.equal('app-test4-10');
                    done();
                });
            });

            it('puts result it into cache with request hash as cache key if no cacheKey defined', (done) => {
                sinon.stub(fakeCacheInstance, 'get').yields(null, false);
                let buildSelectStringSpy = sinon.spy(api, 'buildSelectString');

                sinon.stub(api, 'doRequest', () => {
                    return new q((resolve) => {
                        resolve({it: 'works 7'});
                    });
                });

                new SimpleVertecQuery().setCacheTTL(10).get().then(response => {
                    expect(response.onGrace).to.be.false;
                    expect(response.data.it).to.equal('works 7');
                    expect(response.refresh).to.be.false;
                    expect(cacheSetArguments[0]).to.match(/^app-\w{32}-10$/);
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

                sinon.stub(api, 'select', () => {
                    return new q((resolve) => {
                        resolve({it: 'works 12'});
                    });
                });

                new SimpleVertecQuery().setCacheTTL(10).setCacheGraceTime(5).setCacheKey('test6').get().then(response => {
                    expect(response.onGrace).to.be.true;
                    expect(response.data.it).to.equal('works 9');
                    expect(response.refresh).to.be.false;

                    setTimeout(() => {
                        expect(cacheSetArguments[0]).to.equal('app-test6-10');
                        expect(cacheSetArguments[1].data.it).to.equal('works 12');
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
                    expect(cacheSetArguments[0]).to.be.undefined;
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
                    expect(cacheSetArguments[0]).to.be.undefined;
                    done();
                });
            });

            it('fires request if refresh = true even if item in cache found', (done) => {
                let cacheItem = {
                    softExpire: new Date().getTime() - 1000,
                    data: {it: 'works 11'}
                };
                sinon.stub(fakeCacheInstance, 'get').yields(null, cacheItem);

                sinon.stub(api, 'select', () => {
                    return new q((resolve) => {
                        resolve({it: 'works 13'});
                    });
                });

                new SimpleVertecQuery().setCacheTTL(10).setCacheGraceTime(5).setCacheKey('test8').get(true).then(response => {
                    expect(response.onGrace).to.be.false;
                    expect(response.data.it).to.equal('works 13');
                    expect(response.refresh).to.be.true;
                    expect(cacheSetArguments[0]).to.equal('app-test8-10');
                    done();
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

                sinon.stub(api, 'select', () => {
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
