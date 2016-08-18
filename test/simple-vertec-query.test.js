import {SimpleVertecApi, SimpleVertecQuery} from '../lib/index';
import {expect} from 'chai';
import sinon from 'sinon';

describe('SimpleVertecQuery', () => {
    let query;
    let api;
    let buildSelectObjectSpy;

    beforeEach('setup', () => {
        api = new SimpleVertecApi('http://localhost', 'my-username', 'my-password');
        sinon.stub(api, 'doRequest');
        buildSelectObjectSpy = sinon.spy(api, 'buildSelectObject');

        query = new SimpleVertecQuery(api);
    });

    describe('some basics', () => {
        it('logging will be called', () => {
        });

        it('sets api', () => {
        });

        it('sets defaultOptions', () => {
        });
    });

    describe('createSelectQuery()', () => {
        it('createSelectQuery creates a new instances of SimpleVertecQuery', () => {
            expect(query.createSelectQuery()).to.be.an.instanceof(SimpleVertecQuery);
        });

        it('findById() sets objref as query param', () => {
            query.createSelectQuery().findById(123).get();

            expect(buildSelectObjectSpy.returnValues.shift()).to.deep.equal({
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
            query.createSelectQuery().whereOcl('something').get();

            expect(buildSelectObjectSpy.returnValues.shift()).to.deep.equal({
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
            query.createSelectQuery().whereSql('something').get();

            expect(buildSelectObjectSpy.returnValues.shift()).to.deep.equal({
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
            query.createSelectQuery().orderBy('something').get();

            expect(buildSelectObjectSpy.returnValues.shift()).to.deep.equal({
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
            query.createSelectQuery().whereOcl('x = ?, y = ?').addParam('123').addParam('234').get();

            expect(buildSelectObjectSpy.returnValues.shift()).to.deep.equal({
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
            query.createSelectQuery().whereOcl('x = :x, y = :y, z = :z').addParam({x: 123}).addParam({y: 234, z: 345}).get();

            expect(buildSelectObjectSpy.returnValues.shift()).to.deep.equal({
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
            query.createSelectQuery().whereOcl('x = ?, y = ?').addParams('123', '234').get();

            expect(buildSelectObjectSpy.returnValues.shift()).to.deep.equal({
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
            query.createSelectQuery()
                .addField('code')
                .addField('date')
                .addField({ocl: 'something', alias: 'else'})
                .addField('foo', 'bar')
                .get();

            expect(buildSelectObjectSpy.returnValues.shift()).to.deep.equal({
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
            query.createSelectQuery()
                .addField('code')
                .addField({ocl: 'something', alias: 'else'})
                .addFields(
                    {ocl: 'foo', alias: 'bar'},
                    'date', 'title',
                    {ocl: 'bla', alias: 'blub'}
                )
                .get();

            expect(buildSelectObjectSpy.returnValues.shift()).to.deep.equal({
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

        it('setCacheTTL() sets ttl for cache objects', () => {
        });

        it('setCacheGraceTime() sets grace time for cache objects', () => {
        });

        it('setCacheAutoRefresh() sets auto refresh on expired cache objects in grace mode', () => {
        });

        describe('get()', () => {
            it('compiles an empty query when no options set', () => {
                query.createSelectQuery().get();

                expect(buildSelectObjectSpy.returnValues.shift()).to.deep.equal({
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
                query.createSelectQuery().findById(123).whereOcl('leistungen').whereSql('something').orderBy('date').get();

                expect(buildSelectObjectSpy.returnValues.shift()).to.deep.equal({
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
                let firstQuery = query.createSelectQuery().findById(123).whereOcl('leistungen').addField('code');
                let secondQuery = query.createSelectQuery().whereSql('x = ?').addParam(234).orderBy('date').addField('title');

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

                expect(buildSelectObjectSpy.returnValues.shift()).to.deep.equal({
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
});
