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

    describe('global add methods', () => {
        it('addParam() adds one param to params array', () => {
        });

        it('addParams() adds multiple params to params array', () => {
        });

        it('addField() adds one field to fields array', () => {
        });

        it('addFields() adds multiple fields to fields array', () => {
        });
    });

    describe('createSelectQuery()', () => {
        it('createSelectQuery creates a new instances of SimpleVertecQuery', () => {
            expect(query.createSelectQuery()).to.be.an.instanceof(SimpleVertecQuery);
        });

        it('New instances of SimpleVertecQuery inherits constructor arguments', () => {
        });

        it('New instances of SimpleVertecQuery inherits constructor arguments', () => {
        });

        it('findById() sets objref as query param', () => {
        });

        it('whereOcl() sets ocl as query param', () => {
        });

        it('whereSql() sets sqlwhere as query param', () => {
        });

        it('setOrder() sets sqlorder as query param', () => {
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
        });
    });
});
