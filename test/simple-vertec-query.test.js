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

    describe('some basic', () => {
        it('sets default api', () => {
            expect(SimpleVertecQuery.api).to.equal(api);
        });

        it('sets cache instance', () => {
            let fakeCache = {};
            SimpleVertecQuery.setMemcached(fakeCache);

            expect(SimpleVertecQuery.cache).to.equal(fakeCache);
        });

        it('sets cache instance', () => {
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

        it('addFields() adds multiple fields to fields array', () => {
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

        it('setCacheKey() sets cache key for cache objects', () => {
            let query = new SimpleVertecQuery().setCacheKey('test');
            expect(query.cacheKey).to.equal('test');
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

    describe('cache testing', () => {
        describe('without cache access', () => {
            it('returns raw output of api if no cache is set', (done) => {
                SimpleVertecQuery.setMemcached(undefined);

                sinon.stub(api, 'doRequest', () => {
                    return new q((resolve) => {
                        resolve({it: 'works'});
                    });
                });

                new SimpleVertecQuery().get().then(response => {
                    expect(response.cacheDateTime).to.be.undefined;
                    expect(response.data.it).to.equal('works');
                    done();
                });
            });

            it('returns raw output of api if no cache ttl is set', (done) => {
                SimpleVertecQuery.setMemcached({});

                sinon.stub(api, 'doRequest', () => {
                    return new q((resolve) => {
                        resolve({it: 'works'});
                    });
                });

                new SimpleVertecQuery().get().then(response => {
                    expect(response.cacheDateTime).to.be.undefined;
                    expect(response.data.it).to.equal('works');
                    done();
                });
            });

            it('catches request errors', (done) => {
                sinon.stub(api, 'doRequest', () => {
                    return new q((resolve, reject) => {
                        reject({ Error: 'Some error message' });
                    });
                });

                new SimpleVertecQuery().get().then(
                    (result) => {
                        throw new Error('Promise was unexpectedly fulfilled. Result: ' + JSON.stringify(result));
                    },
                    (error) => {
                        expect(error).to.include.keys('Error');
                        done();
                    }
                );
            });
        });

        describe('with cache access', () => {
            let fakeCacheInstance;
            let cacheSetSpy;

            beforeEach('query setup', () => {
                SimpleVertecQuery.setAppCacheKey('app');

                sinon.stub(api, 'doRequest', () => {
                    return new q((resolve) => {
                        resolve([{it: 'works'}]);
                    });
                });

                fakeCacheInstance = {
                    get() {},
                    set() {}
                };
                SimpleVertecQuery.setMemcached(fakeCacheInstance);

                cacheSetSpy = sinon.spy(fakeCacheInstance, 'set');
            });

            it('puts result into cache with ttl', (done) => {
                sinon.stub(fakeCacheInstance, 'get').yields(null, false);

                new SimpleVertecQuery().setCacheTTL(10).setCacheKey('test').get().then(response => {
                    expect(response.onGrace).to.be.false;
                    expect(response.data[0].it).to.equal('works');
                    expect(response.refresh).to.be.false;
                    expect(cacheSetSpy.alwaysCalledWith('app-test')).to.be.true;
                    expect(cacheSetSpy.args.shift()[2]).to.equal(10);
                    done();
                });
            });

            it('puts result into cache with ttl and grace time which saves soft expire date into cache item', (done) => {
                sinon.stub(fakeCacheInstance, 'get').yields(null, false);

                new SimpleVertecQuery().setCacheTTL(10).setCacheGraceTime(5).setCacheKey('test').get().then(response => {
                    expect(response.onGrace).to.be.false;
                    expect(response.data[0].it).to.equal('works');
                    expect(response.refresh).to.be.false;
                    expect(cacheSetSpy.alwaysCalledWith('app-test-10')).to.be.true;

                    let setArgs = cacheSetSpy.args.shift();
                    expect(setArgs[1].softExpire).to.be.closeTo(new Date().getTime() + 10*1000, 500);
                    expect(setArgs[2]).to.equal(15);
                    done();
                });
            });

            it('fires request if no item in cache found and puts it into cache', (done) => {
                sinon.stub(fakeCacheInstance, 'get').yields(null, false);

                new SimpleVertecQuery().setCacheTTL(10).setCacheKey('test').get().then(response => {
                    expect(response.onGrace).to.be.false;
                    expect(response.data[0].it).to.equal('works');
                    expect(response.refresh).to.be.false;
                    expect(cacheSetSpy.alwaysCalledWith('app-test')).to.be.true;
                    done();
                });
            });

            it('puts result it into cache with request hash as cache key if no cacheKey defined', (done) => {
                sinon.stub(fakeCacheInstance, 'get').yields(null, false);
                let buildSelectStringSpy = sinon.spy(api, 'buildSelectString');

                new SimpleVertecQuery().setCacheTTL(10).get().then(response => {
                    expect(response.onGrace).to.be.false;
                    expect(response.data[0].it).to.equal('works');
                    expect(response.refresh).to.be.false;

                    let setArgs = cacheSetSpy.args.shift();
                    expect(setArgs[0]).to.match(/^app-\w{32}$/);
                    expect(buildSelectStringSpy.returnValues).to.have.lengthOf(2);
                    done();
                });
            });

            it('does not fire request if item in cache found without grace', (done) => {
                let cacheItem = {
                    softExpire: 0,
                    data: [{it: 'works'}]
                };
                sinon.stub(fakeCacheInstance, 'get').yields(null, cacheItem);

                new SimpleVertecQuery().setCacheTTL(10).setCacheKey('test').get().then(response => {
                    expect(response.onGrace).to.be.false;
                    expect(response.data[0].it).to.equal('works');
                    expect(response.refresh).to.be.false;
                    expect(cacheSetSpy.neverCalledWith('app-test')).to.be.true;
                    done();
                });
            });

            it('fires request if item in cache found which is on grace', (done) => {
                let cacheItem = {
                    softExpire: new Date().getTime() - 1000,
                    data: [{it: 'works'}]
                };
                sinon.stub(fakeCacheInstance, 'get').yields(null, cacheItem);

                new SimpleVertecQuery().setCacheTTL(10).setCacheGraceTime(5).setCacheKey('test').get().then(response => {
                    expect(response.onGrace).to.be.true;
                    expect(response.data[0].it).to.equal('works');
                    expect(response.refresh).to.be.false;
                    expect(cacheSetSpy.alwaysCalledWith('app-test')).to.be.true;
                    done();
                });
            });

            it('does not fire request if item in cache found which could be on grace but is not', (done) => {
                let cacheItem = {
                    softExpire: new Date().getTime() + 1000,
                    data: [{it: 'works'}]
                };
                sinon.stub(fakeCacheInstance, 'get').yields(null, cacheItem);

                new SimpleVertecQuery().setCacheTTL(10).setCacheGraceTime(5).setCacheKey('test').get().then(response => {
                    expect(response.onGrace).to.be.false;
                    expect(response.data[0].it).to.equal('works');
                    expect(response.refresh).to.be.false;
                    expect(cacheSetSpy.neverCalledWith('app-test')).to.be.true;
                    done();
                });
            });

            it('fires request if refresh = true even if item in cache found', (done) => {
                let cacheItem = {
                    softExpire: new Date().getTime() - 1000,
                    data: [{it: 'works'}]
                };
                sinon.stub(fakeCacheInstance, 'get').yields(null, cacheItem);

                new SimpleVertecQuery().setCacheTTL(10).setCacheGraceTime(5).setCacheKey('test').get(true).then(response => {
                    expect(response.onGrace).to.be.false;
                    expect(response.data[0].it).to.equal('works');
                    expect(response.refresh).to.be.true;
                    expect(cacheSetSpy.alwaysCalledWith('app-test')).to.be.true;
                    done();
                });
            });

            it('catches cache fetching errors', (done) => {
                sinon.stub(fakeCacheInstance, 'get').yields({ Error: 'Some error message' }, null);

                new SimpleVertecQuery().setCacheTTL(10).get().then(
                    (result) => {
                        throw new Error('Promise was unexpectedly fulfilled. Result: ' + JSON.stringify(result));
                    },
                    (error) => {
                        expect(error).to.include.keys('Error');
                        done();
                    }
                );
            });

            it('catches request errors', (done) => {
                sinon.stub(fakeCacheInstance, 'get').yields(null, null);

                api.doRequest.restore();
                sinon.stub(api, 'doRequest', () => {
                    return new q((resolve, reject) => {
                        reject({ Error: 'Some error message' });
                    });
                });

                new SimpleVertecQuery().setCacheTTL(10).setCacheKey('test').get().then(
                    (result) => {
                        throw new Error('Promise was unexpectedly fulfilled. Result: ' + JSON.stringify(result));
                    },
                    (error) => {
                        expect(error).to.include.keys('Error');
                        done();
                    }
                );
            });
        });
    });
});
