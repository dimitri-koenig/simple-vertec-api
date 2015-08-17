import {SimpleVertecApi} from '../lib/simple-vertec-api';
import {expect} from 'chai';
import sinon from 'sinon';
import moment from 'moment';

describe('SimpleVertecApi', () => {
    var api;
    var buildXmlSpy;

    beforeEach('setup', () => {
        api = new SimpleVertecApi('http://localhost', 'my-username', 'my-password');
        buildXmlSpy = sinon.spy(api, 'buildXml');
    });

    describe('some basics', () => {
        it('logging will be called', () => {
            sinon.stub(api, 'doRequest');
            api.verbose = true;
            var consoleMock = sinon.stub(console, 'log');

            api.select('something', []);

            expect(consoleMock.called).to.equal(true);

            consoleMock.restore();
        });

        it('sets authentication data', () => {
            sinon.stub(api, 'doRequest');

            api.select('something', []);
            expect(buildXmlSpy.returnValues.shift()).to.equal('<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>something</ocl></Selection></Query></Body></Envelope>');
        });

        it('does two requests with same auth data', () => {
            sinon.stub(api, 'doRequest');

            api.select('something', []);
            expect(buildXmlSpy.returnValues.shift()).to.equal('<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>something</ocl></Selection></Query></Body></Envelope>');

            api.select('something else', []);
            expect(buildXmlSpy.returnValues.shift()).to.equal('<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>something else</ocl></Selection></Query></Body></Envelope>');
        });

        it('converts response to json and extracts useful content', () => {
            sinon.stub(api, 'request').yields(null, null, '<?xml version="1.0" encoding="UTF-8"?><Envelope><Body><QueryResponse><Kontakt><objid>12345</objid><sprache>DE</sprache></Kontakt><Kontakt><objid>23456</objid><sprache>EN</sprache></Kontakt></QueryResponse></Body></Envelope>');

            return api.select('something', []).then(
                (content) => {
                    expect(content.Kontakt.length).to.equal(2);
                    expect(content.Kontakt[0].objid).to.equal('12345');
                    expect(content.Kontakt[0].sprache).to.equal('DE');
                    expect(content.Kontakt[1].objid).to.equal('23456');
                    expect(content.Kontakt[1].sprache).to.equal('EN');
                });
        });

        it('converts fault messages from server', () => {
            sinon.stub(api, 'request').yields(null, null, '<?xml version="1.0" encoding="UTF-8"?><Envelope><Body><Fault><faultcode>Client</faultcode></Fault></Body></Envelope>');

            return api.select('some faulty select', []).then(
                (result) => {
                    throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
                }, (result) => {
                    expect(result).to.include.keys('Fault');
                });
        });

        it('catches request errors', () => {
            sinon.stub(api, 'request').yields({ Error: 'Some error message' }, null, null);

            return api.select('some faulty select', []).then(
                (result) => {
                    throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
                }, (result) => {
                    expect(result).to.include.keys('Error');
                });
        });
    });

    describe('select()', () => {
        it('sets members and expressions', () => {
            sinon.stub(api, 'doRequest');

            api.select('something', [
                'normal-field',
                {
                    alias: 'foobar',
                    ocl:   'object.field'
                }
            ]);
            expect(buildXmlSpy.returnValues.shift()).to.equal('<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>something</ocl></Selection><Resultdef><member>normal-field</member><expression><alias>foobar</alias><ocl>object.field</ocl></expression></Resultdef></Query></Body></Envelope>');
        });

        it('throws an error if no select or fields arguments given', () => {
            sinon.stub(api, 'doRequest');
            var selectSpy = sinon.spy(api, 'select');

            try {
                api.select();
            } catch (e) {
                // we only need the finally block
            } finally {
                expect(selectSpy.exceptions).to.have.length(1);
                expect(selectSpy.exceptions.shift().message).to.have.string('1438427960');
            }

            try {
                api.select('something');
            } catch (e) {
                // we only need the finally block
            } finally {
                expect(selectSpy.exceptions).to.have.length(1);
                expect(selectSpy.exceptions.shift().message).to.have.string('1438427960');
            }
        });

        it('throws an error if select or fields arguments are not valid', () => {
            sinon.stub(api, 'doRequest');
            var selectSpy = sinon.spy(api, 'select');

            try {
                api.select('some select', { foo: 'bar' });
            } catch (e) {
                // we only need the finally block
            } finally {
                expect(selectSpy.exceptions).to.have.length(1);
                expect(selectSpy.exceptions.shift().message).to.have.string('1438428337');
            }

            try {
                api.select(['something'], []);
            } catch (e) {
                // we only need the finally block
            } finally {
                expect(selectSpy.exceptions).to.have.length(1);
                expect(selectSpy.exceptions.shift().message).to.have.string('1438428337');
            }

            try {
                api.select(null, 'something', []);
            } catch (e) {
                // we only need the finally block
            } finally {
                expect(selectSpy.exceptions).to.have.length(1);
                expect(selectSpy.exceptions.shift().message).to.have.string('1438428337');
            }
        });

        it('throws an error on an unknown field config type', () => {
            sinon.stub(api, 'doRequest');
            var selectSpy = sinon.spy(api, 'select');

            try {
                api.select('something', [123]);
            } catch (e) {
                // we only need the finally block
            } finally {
                expect(selectSpy.exceptions).to.have.length(1);
                expect(selectSpy.exceptions.shift().message).to.have.string('1437849815');
            }
        });

        it('accepts array as params argument in query', () => {
            sinon.stub(api, 'doRequest');

            api.select(
                'where-expression = ?',
                [123],
                [
                    'normal-field',
                    {
                        alias: 'foobar',
                        ocl:   'object.field'
                    }
                ]
            );
            expect(buildXmlSpy.returnValues.shift()).to.equal('<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>where-expression = 123</ocl></Selection><Resultdef><member>normal-field</member><expression><alias>foobar</alias><ocl>object.field</ocl></expression></Resultdef></Query></Body></Envelope>');
        });

        it('returns ? placeholder if more placeholders then params in array given', () => {
            sinon.stub(api, 'doRequest');

            api.select(
                'where-x-expression = ? and where-y-expression = ?',
                [123],
                [
                    'normal-field',
                    {
                        alias: 'foobar',
                        ocl:   'object.field'
                    }
                ]
            );
            expect(buildXmlSpy.returnValues.shift()).to.equal('<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>where-x-expression = 123 and where-y-expression = ?</ocl></Selection><Resultdef><member>normal-field</member><expression><alias>foobar</alias><ocl>object.field</ocl></expression></Resultdef></Query></Body></Envelope>');
        });

        it('accepts object as params argument in query', () => {
            sinon.stub(api, 'doRequest');

            api.select(
                'where-x-expression = :id and where-y-expression = :id',
                {
                    id: 123
                },
                [
                    'normal-field',
                    {
                        alias: 'foobar',
                        ocl:   'object.field'
                    }
                ]
            );
            expect(buildXmlSpy.returnValues.shift()).to.equal('<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>where-x-expression = 123 and where-y-expression = 123</ocl></Selection><Resultdef><member>normal-field</member><expression><alias>foobar</alias><ocl>object.field</ocl></expression></Resultdef></Query></Body></Envelope>');
        });

        it('throws an error if named parameter does not exist in params object', () => {
            sinon.stub(api, 'doRequest');
            var selectSpy = sinon.spy(api, 'select');

            try {
                api.select(
                    'where-x-expression = :id and where-y-expression = :name',
                    {
                        id: 123
                    },
                    ['foobar']);
            } catch (e) {
                // we only need the finally block
            } finally {
                expect(selectSpy.exceptions).to.have.length(1);
                expect(selectSpy.exceptions.shift().message).to.have.string('1438415385');
            }
        });

        it('converts select parameter of type Date/moment to special encodeDate format', () => {
            sinon.stub(api, 'doRequest');

            api.select(
                'where-x-expression = :id and where-y-expression = :fromDate and where-z-expression = :toDate',
                {
                    id:       123,
                    fromDate: new Date('2015-08-03'),
                    toDate:   moment('2015-08-09')
                },
                ['foobar']
            );
            expect(buildXmlSpy.returnValues.shift()).to.equal('<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>where-x-expression = 123 and where-y-expression = encodeDate(2015,8,3) and where-z-expression = encodeDate(2015,8,9)</ocl></Selection><Resultdef><member>foobar</member></Resultdef></Query></Body></Envelope>');

            api.select(
                'where-x-expression = ? and where-y-expression = ? and where-z-expression = ?',
                [
                    123,
                    new Date('2015-08-03'),
                    moment('2015-08-09')
                ],
                ['foobar']
            );
            expect(buildXmlSpy.returnValues.shift()).to.equal('<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>where-x-expression = 123 and where-y-expression = encodeDate(2015,8,3) and where-z-expression = encodeDate(2015,8,9)</ocl></Selection><Resultdef><member>foobar</member></Resultdef></Query></Body></Envelope>');
        });

        it('accepts a string/number/date as param argument in query', () => {
            sinon.stub(api, 'doRequest');

            var select = 'where-x-expression = ?';
            var fields = [];

            var param = 123;
            api.select(select, param, fields);
            expect(buildXmlSpy.returnValues.shift()).to.equal('<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>where-x-expression = 123</ocl></Selection></Query></Body></Envelope>');

            param = 'foobar';
            api.select(select, param, fields);
            expect(buildXmlSpy.returnValues.shift()).to.equal('<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>where-x-expression = foobar</ocl></Selection></Query></Body></Envelope>');

            param = new Date('2015-08-01');
            api.select(select, param, fields);
            expect(buildXmlSpy.returnValues.shift()).to.equal('<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>where-x-expression = encodeDate(2015,8,1)</ocl></Selection></Query></Body></Envelope>');
        });

        it('accepts object as select argument in query', () => {
            sinon.stub(api, 'doRequest');

            api.select(
                {
                    objref:   987,
                    ocl:      'something :param1',
                    sqlwhere: 'something else :param2',
                    sqlorder: 'foobar :param3'
                },
                {
                    param1: 123,
                    param2: 234,
                    param3: 345
                },
                [
                    'normal-field',
                    {
                        alias: 'foobar',
                        ocl:   'object.field'
                    }
                ]
            );

            expect(buildXmlSpy.returnValues.shift()).to.equal('<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><objref>987</objref><ocl>something 123</ocl><sqlwhere>something else 234</sqlwhere><sqlorder>foobar 345</sqlorder></Selection><Resultdef><member>normal-field</member><expression><alias>foobar</alias><ocl>object.field</ocl></expression></Resultdef></Query></Body></Envelope>');
        });

        it('accepts select object with multiple objref references', () => {
            sinon.stub(api, 'doRequest');

            api.select(
                {
                    objref:   [
                        987,
                        876
                    ],
                    ocl:      'something :param1',
                    sqlwhere: 'something else :param2',
                    sqlorder: 'foobar :param3'
                },
                {
                    param1: 123,
                    param2: 234,
                    param3: 345
                },
                [
                    'normal-field',
                    {
                        alias: 'foobar',
                        ocl:   'object.field'
                    }
                ]
            );

            expect(buildXmlSpy.returnValues.shift()).to.equal('<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><objref>987</objref><objref>876</objref><ocl>something 123</ocl><sqlwhere>something else 234</sqlwhere><sqlorder>foobar 345</sqlorder></Selection><Resultdef><member>normal-field</member><expression><alias>foobar</alias><ocl>object.field</ocl></expression></Resultdef></Query></Body></Envelope>');
        });
    });

    describe('delete()', () => {
        it('accepts a number as parameter', () => {
            sinon.stub(api, 'doRequest');

            api.delete('123');
            expect(buildXmlSpy.returnValues.shift()).to.equal('<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Delete><objref>123</objref></Delete></Body></Envelope>');

            api.delete(123);
            expect(buildXmlSpy.returnValues.shift()).to.equal('<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Delete><objref>123</objref></Delete></Body></Envelope>');
        });

        it('accepts an array of ids', () => {
            sinon.stub(api, 'doRequest');

            api.delete([
                '123',
                234
            ]);
            expect(buildXmlSpy.returnValues.shift()).to.equal('<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Delete><objref>123</objref><objref>234</objref></Delete></Body></Envelope>');
        });

        it('throws an error if an id is not a number', () => {
            sinon.stub(api, 'doRequest');
            var deleteSpy = sinon.spy(api, 'delete');

            try {
                api.delete({ foo: 'bar' });
            } catch (e) {
                // we only need the finally block
            } finally {
                expect(deleteSpy.exceptions).to.have.length(1);
                expect(deleteSpy.exceptions.shift().message).to.have.string('1439056797');
            }

            try {
                api.delete([
                    123,
                    { foo: 'bar' }
                ]);
            } catch (e) {
                // we only need the finally block
            } finally {
                expect(deleteSpy.exceptions).to.have.length(1);
                expect(deleteSpy.exceptions.shift().message).to.have.string('1439056797');
            }
        });
    });

    describe('save()', () => {
        it('accepts a class name and an array of fields', () => {
            sinon.stub(api, 'doRequest');

            api.save('OffeneLeistung', {
                bearbeiter: {
                    objref: 123
                },
                projekt:    {
                    objref: 234
                },
                minutenint: 60
            });
            expect(buildXmlSpy.returnValues.shift()).to.equal('<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Create><OffeneLeistung><bearbeiter><objref>123</objref></bearbeiter><projekt><objref>234</objref></projekt><minutenint>60</minutenint></OffeneLeistung></Create></Body></Envelope>');
        });

        it('accepts an array of new objects-data', () => {
            sinon.stub(api, 'doRequest');

            api.save([
                {
                    className: 'OffeneLeistung',
                    data:      {
                        bearbeiter: {
                            objref: 123
                        },
                        projekt:    {
                            objref: 234
                        },
                        minutenint: 60
                    }
                },
                {
                    className: 'SonstigeLeistung',
                    data:      {
                        phase:      {
                            objref: 345
                        },
                        minutenExt: 30
                    }
                }
            ]);
            expect(buildXmlSpy.returnValues.shift()).to.equal('<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Create><OffeneLeistung><bearbeiter><objref>123</objref></bearbeiter><projekt><objref>234</objref></projekt><minutenint>60</minutenint></OffeneLeistung><SonstigeLeistung><phase><objref>345</objref></phase><minutenExt>30</minutenExt></SonstigeLeistung></Create></Body></Envelope>');
        });

        it('uses update cmd if object already exists', () => {
            sinon.stub(api, 'doRequest');

            api.save([
                {
                    className: 'OffeneLeistung',
                    data:      {
                        bearbeiter: {
                            objref: 123
                        },
                        projekt:    {
                            objref: 234
                        },
                        minutenint: 60
                    }
                },
                {
                    className: 'VerrechneteLeistung',
                    data:      {
                        objref:     987,
                        phase:      {
                            objref: 345
                        },
                        minutenExt: 30
                    }
                }
            ]);
            expect(buildXmlSpy.returnValues.shift()).to.equal('<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Create><OffeneLeistung><bearbeiter><objref>123</objref></bearbeiter><projekt><objref>234</objref></projekt><minutenint>60</minutenint></OffeneLeistung></Create><Update><VerrechneteLeistung><objref>987</objref><phase><objref>345</objref></phase><minutenExt>30</minutenExt></VerrechneteLeistung></Update></Body></Envelope>');
        });

        it('throws an error if className or data fields not present or not valid', () => {
            sinon.stub(api, 'doRequest');
            var createSpy = sinon.spy(api, 'save');

            try {
                api.save({ foo: 'bar' });
            } catch (e) {
                // we only need the finally block
            } finally {
                expect(createSpy.exceptions).to.have.length(1);
                expect(createSpy.exceptions.shift().message).to.have.string('1439115447');
            }

            try {
                api.save([
                    123,
                    { foo: 'bar' }
                ]);
            } catch (e) {
                // we only need the finally block
            } finally {
                expect(createSpy.exceptions).to.have.length(1);
                expect(createSpy.exceptions.shift().message).to.have.string('1439114369');
            }

            try {
                api.save([
                    {
                        noClassName: 'foobar',
                        data:        { foo: 'bar' }
                    }
                ]);
            } catch (e) {
                // we only need the finally block
            } finally {
                expect(createSpy.exceptions).to.have.length(1);
                expect(createSpy.exceptions.shift().message).to.have.string('1439114369');
            }

            try {
                api.save([
                    {
                        className: 'foobar',
                        noData:    { foo: 'bar' }
                    }
                ]);
            } catch (e) {
                // we only need the finally block
            } finally {
                expect(createSpy.exceptions).to.have.length(1);
                expect(createSpy.exceptions.shift().message).to.have.string('1439114369');
            }
        });
    });
});
