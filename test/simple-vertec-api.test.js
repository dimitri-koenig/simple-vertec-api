import {SimpleVertecApi} from '../lib/simple-vertec-api';
import {expect} from 'chai';
import sinon from 'sinon';
import xmlDigester from 'xml-digester';
import q from 'bluebird';
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

            api.select('something');

            expect(consoleMock.called).to.equal(true);

            consoleMock.restore();
        });

        it('sets authentication data', () => {
            sinon.stub(api, 'doRequest');

            api.select('something');
            compareFilteredString(buildXmlSpy.returnValues.shift(), '<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>something</ocl></Selection></Query></Body></Envelope>');
        });

        it('does two requests with same auth data', () => {
            sinon.stub(api, 'doRequest');

            api.select('something');
            compareFilteredString(buildXmlSpy.returnValues.shift(), '<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>something</ocl></Selection></Query></Body></Envelope>');

            api.select('something else');
            compareFilteredString(buildXmlSpy.returnValues.shift(), '<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>something else</ocl></Selection></Query></Body></Envelope>');
        });

        it('converts response to json and extracts useful content', () => {
            sinon.stub(api, 'request').yields(null, null, '<?xml version="1.0" encoding="UTF-8"?><Envelope><Body><QueryResponse><Kontakt><objid>12345</objid><sprache>DE</sprache></Kontakt><Kontakt><objid>23456</objid><sprache>EN</sprache></Kontakt></QueryResponse></Body></Envelope>');

            return api.select('something').then(
                (content) => {
                    expect(content.Kontakt.length).to.equal(2);
                    expect(content.Kontakt[0].objid).to.equal('12345');
                    expect(content.Kontakt[0].sprache).to.equal('DE');
                    expect(content.Kontakt[1].objid).to.equal('23456');
                    expect(content.Kontakt[1].sprache).to.equal('EN');
                });
        });

        it('creates object if an alias contains one dot', () => {
            sinon.stub(api, 'request').yields(null, null, '<?xml version="1.0" encoding="UTF-8"?><Envelope><Body><QueryResponse><List><Person.Kontakt><objid>12345</objid><sprache>DE</sprache></Person.Kontakt><Person.Kontakt><objid>23456</objid><sprache>EN</sprache></Person.Kontakt><Person.Addresse><objid>12345</objid></Person.Addresse><Person.Addresse><objid>23456</objid></Person.Addresse></List></QueryResponse></Body></Envelope>');

            return api.select('something').then(
                (content) => {
                    expect(content.List.Person.Kontakt.length).to.equal(2);
                    expect(content.List.Person.Kontakt[0].objid).to.equal('12345');
                    expect(content.List.Person.Kontakt[0].sprache).to.equal('DE');
                    expect(content.List.Person.Kontakt[1].objid).to.equal('23456');
                    expect(content.List.Person.Kontakt[1].sprache).to.equal('EN');
                    expect(content.List.Person.Addresse.length).to.equal(2);
                    expect(content.List.Person.Addresse[0].objid).to.equal('12345');
                    expect(content.List.Person.Addresse[1].objid).to.equal('23456');
                });
        });

        it('creates object if an alias contains multiple dots', () => {
            sinon.stub(api, 'request').yields(null, null, '<?xml version="1.0" encoding="UTF-8"?><Envelope><Body><QueryResponse><List><Person.Kontakt.Details><objid>12345</objid><sprache>DE</sprache></Person.Kontakt.Details><Person.Kontakt.Details><objid>23456</objid><sprache>EN</sprache></Person.Kontakt.Details><Person.Addresse.Details><objid>12345</objid></Person.Addresse.Details><Person.Addresse.Details><objid>23456</objid></Person.Addresse.Details></List></QueryResponse></Body></Envelope>');

            return api.select('something').then(
                (content) => {
                    expect(content.List.Person.Kontakt.Details.length).to.equal(2);
                    expect(content.List.Person.Kontakt.Details[0].objid).to.equal('12345');
                    expect(content.List.Person.Kontakt.Details[0].sprache).to.equal('DE');
                    expect(content.List.Person.Kontakt.Details[1].objid).to.equal('23456');
                    expect(content.List.Person.Kontakt.Details[1].sprache).to.equal('EN');
                    expect(content.List.Person.Addresse.Details.length).to.equal(2);
                    expect(content.List.Person.Addresse.Details[0].objid).to.equal('12345');
                    expect(content.List.Person.Addresse.Details[1].objid).to.equal('23456');
                });
        });

        it('converts fault messages from server', () => {
            sinon.stub(api, 'request').yields(null, null, '<?xml version="1.0" encoding="UTF-8"?><Envelope><Body><Fault><faultcode>Client</faultcode></Fault></Body></Envelope>');

            return api.select('some faulty select').then(
                (result) => {
                    throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
                },
                (result) => {
                    expect(result).to.include.keys('Fault');
                }
            );
        });

        it('converts html error messages from server', () => {
            sinon.stub(api, 'request').yields(null, null, '<HTML><BODY><P>Error message with missing closing p tag!</BODY></HTML>');

            return api.select('some select with fauly response').then(
                (result) => {
                    throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
                },
                (result) => {
                    expect(result).to.include.keys('Error');
                    expect(result.Error.faultstring).to.equal('Error message with missing closing p tag!');
                }
            );
        });

        it('catches xml to json conversion errors', (done) => {
            sinon.stub(api, 'request').yields(null, null, '<container><firstElement><onlyFirstTag>Missing closing tag!</firstElement></container>');

            let xmlDigesterLogger = xmlDigester._logger;
            let originalLevel = xmlDigesterLogger.level();
            xmlDigesterLogger.level(0.5);

            return api.select('some select with fauly response').then(
                (result) => {
                    throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
                },
                () => {
                    done();
                }
            ).finally(() => {
                xmlDigesterLogger.level(originalLevel);
            });
        });

        it('catches request errors', () => {
            sinon.stub(api, 'request').yields({ Error: 'Some error message' }, null, null);

            return api.select('some faulty select').then(
                (result) => {
                    throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
                },
                (result) => {
                    expect(result).to.include.keys('Error');
                }
            );
        });

        it('determines correct retry strategy', () => {
            expect(api.requestRetryStrategy(null, {})).to.be.false;
            expect(api.requestRetryStrategy({}, {})).to.be.true;
            expect(api.requestRetryStrategy(null, {statusCode: 300})).to.be.false;
            expect(api.requestRetryStrategy(null, {statusCode: 400})).to.be.true;
            expect(api.requestRetryStrategy(null, {statusCode: 500})).to.be.true;
            expect(api.requestRetryStrategy(null, {body: '<xml><something /></xml>'})).to.be.false;
            expect(api.requestRetryStrategy(null, {body: '<xml><fault>something</fault></xml>'})).to.be.true;
            expect(api.requestRetryStrategy(null, {body: '<DOCTYPE><HTML><BODY>SOMETHING</BODY></HTML>'})).to.be.true;
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
            compareFilteredString(buildXmlSpy.returnValues.shift(), '<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>something</ocl></Selection><Resultdef><member>normal-field</member><expression><alias>foobar</alias><ocl>object.field</ocl></expression></Resultdef></Query></Body></Envelope>');
        });

        it('throws an error if no valid select query given', () => {
            sinon.stub(api, 'doRequest');
            var selectSpy = sinon.spy(api, 'select');

            try {
                api.select();
            } catch (e) {
                // we only need the finally block
            } finally {
                expect(selectSpy.exceptions).to.have.length(1);
                expect(selectSpy.exceptions.shift().message).to.have.string('1438428337');
            }

            try {
                api.select(12345);
            } catch (e) {
                // we only need the finally block
            } finally {
                expect(selectSpy.exceptions).to.have.length(1);
                expect(selectSpy.exceptions.shift().message).to.have.string('1438428337');
            }

            try {
                api.select(null);
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
                api.select('something', null);
            } catch (e) {
                // we only need the finally block
            } finally {
                expect(selectSpy.exceptions).to.have.length(1);
                expect(selectSpy.exceptions.shift().message).to.have.string('1449929652');
            }

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
            compareFilteredString(buildXmlSpy.returnValues.shift(), '<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>where-expression = 123</ocl></Selection><Resultdef><member>normal-field</member><expression><alias>foobar</alias><ocl>object.field</ocl></expression></Resultdef></Query></Body></Envelope>');
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
            compareFilteredString(buildXmlSpy.returnValues.shift(), '<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>where-x-expression = 123 and where-y-expression = 123</ocl></Selection><Resultdef><member>normal-field</member><expression><alias>foobar</alias><ocl>object.field</ocl></expression></Resultdef></Query></Body></Envelope>');
        });

        it('accepts a string/number as param argument in query', () => {
            sinon.stub(api, 'doRequest');

            var select = 'where-x-expression = ?';
            var fields = [];

            var param = 123;
            api.select(select, param, fields);
            compareFilteredString(buildXmlSpy.returnValues.shift(), '<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>where-x-expression = 123</ocl></Selection></Query></Body></Envelope>');

            param = 'foobar';
            api.select(select, param, fields);
            compareFilteredString(buildXmlSpy.returnValues.shift(), '<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>where-x-expression = foobar</ocl></Selection></Query></Body></Envelope>');
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

            compareFilteredString(buildXmlSpy.returnValues.shift(), '<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><objref>987</objref><ocl>something 123</ocl><sqlwhere>something else 234</sqlwhere><sqlorder>foobar 345</sqlorder></Selection><Resultdef><member>normal-field</member><expression><alias>foobar</alias><ocl>object.field</ocl></expression></Resultdef></Query></Body></Envelope>');
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

            compareFilteredString(buildXmlSpy.returnValues.shift(), '<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><objref>987</objref><objref>876</objref><ocl>something 123</ocl><sqlwhere>something else 234</sqlwhere><sqlorder>foobar 345</sqlorder></Selection><Resultdef><member>normal-field</member><expression><alias>foobar</alias><ocl>object.field</ocl></expression></Resultdef></Query></Body></Envelope>');
        });

        it('escapes select object properties', () => {
            sinon.stub(api, 'doRequest');

            api.select(
                {
                    ocl:      '\':param1\'',
                    sqlwhere: 'something < else > :param2 & foobar',
                    sqlorder: 'foobar ":param3"'
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

            compareFilteredString(buildXmlSpy.returnValues.shift(), '<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>&apos;123&apos;</ocl><sqlwhere>something &lt; else &gt; 234 &amp; foobar</sqlwhere><sqlorder>foobar &apos;345&apos;</sqlorder></Selection><Resultdef><member>normal-field</member><expression><alias>foobar</alias><ocl>object.field</ocl></expression></Resultdef></Query></Body></Envelope>');
        });

        it('replaces placeholders both in query and fields', () => {
            sinon.stub(api, 'doRequest');

            api.select(
                'where-x-expression = :id and where-y-expression = ":date"',
                {
                    id: 123,
                    date: '2015-09-21'
                },
                [
                    'normal-field :id',
                    {
                        alias: 'foobar-:id',
                        ocl:   'object.field-:date'
                    }
                ]
            );
            compareFilteredString(buildXmlSpy.returnValues.shift(), '<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>where-x-expression = 123 and where-y-expression = &apos;2015-09-21&apos;</ocl></Selection><Resultdef><member>normal-field 123</member><expression><alias>foobar-123</alias><ocl>object.field-2015-09-21</ocl></expression></Resultdef></Query></Body></Envelope>');
        });

        it('catches multiple equal requests and returns one promise', (done) => {
            var resolveCount = 0;

            sinon.stub(api, 'doRequest', () => {
                return new q((resolve) => {
                    setTimeout(() => { // eslint-disable-line max-nested-callbacks
                        resolveCount++;
                        resolve({it: 'works'});
                    }, 10);
                });
            });

            q.all([
                api.select('something'),
                api.select('something'),
                api.select('something else'),
                api.select('something else'),
                api.select('something again')
            ]).finally(() => {
                api.select('something').then(() => {
                    expect(resolveCount).to.equal(4);
                    done();
                });
            });
        });

        it('has a working garbage collector', (done) => {
            sinon.stub(api, 'doRequest', () => {
                return new q((resolve) => {
                    setTimeout(() => { // eslint-disable-line max-nested-callbacks
                        resolve({it: 'works'});
                    }, 10);
                });
            });

            api.select('something');
            api.select('something else');

            api.gcPromises();
            expect(_.size(api.storedPromises)).to.equal(2);

            q.all([
                api.select('something'),
                api.select('something else'),
                api.select('something again')
            ]).finally(() => {
                expect(_.size(api.storedPromises)).to.equal(3);
                api.gcPromises();
                expect(_.size(api.storedPromises)).to.equal(0);
                done();
            });
        });
    });

    describe('multiSelect()', () => {
        it('combines an array of selection arguments into a single request', () => {
            sinon.stub(api, 'doRequest');

            let firstQuery = [
                'where-x-expression = :id and where-y-expression = ":date"',
                {
                    id: 123,
                    date: '2015-09-21'
                },
                [
                    'normal-field :id',
                    {
                        alias: 'foobar-:id',
                        ocl:   'object.field-:date'
                    }
                ]
            ];

            let secondQuery = [
                {
                    objref: [
                        12345,
                        23456
                    ]
                },
                [
                    'first-field',
                    'second-field'
                ]
            ];

            api.multiSelect([
                firstQuery,
                secondQuery
            ]);
            compareFilteredString(buildXmlSpy.returnValues.shift(), '<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>where-x-expression = 123 and where-y-expression = &apos;2015-09-21&apos;</ocl></Selection><Resultdef><member>normal-field 123</member><expression><alias>foobar-123</alias><ocl>object.field-2015-09-21</ocl></expression></Resultdef></Query><Query><Selection><objref>12345</objref><objref>23456</objref></Selection><Resultdef><member>first-field</member><member>second-field</member></Resultdef></Query></Body></Envelope>');
        });

        it('throws an error if first and only argument is not an array', () => {
            sinon.stub(api, 'doRequest');
            var selectSpy = sinon.spy(api, 'multiSelect');

            try {
                api.multiSelect({foo: 'bar'});
            } catch (e) {
                // we only need the finally block
            } finally {
                expect(selectSpy.exceptions).to.have.length(1);
                expect(selectSpy.exceptions.shift().message).to.have.string('1453380632');
            }

            try {
                api.multiSelect('something');
            } catch (e) {
                // we only need the finally block
            } finally {
                expect(selectSpy.exceptions).to.have.length(1);
                expect(selectSpy.exceptions.shift().message).to.have.string('1453380632');
            }

            try {
                api.multiSelect('something');
            } catch (e) {
                // we only need the finally block
            } finally {
                expect(selectSpy.exceptions).to.have.length(1);
                expect(selectSpy.exceptions.shift().message).to.have.string('1453380632');
            }
        });
    });

    describe('findById()', () => {
        it('accepts a number as first parameter and an array as second', () => {
            sinon.stub(api, 'doRequest');

            api.findById('123', ['foo']);
            compareFilteredString(buildXmlSpy.returnValues.shift(), '<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><objref>123</objref></Selection><Resultdef><member>foo</member></Resultdef></Query></Body></Envelope>');

            api.findById(123, ['bar']);
            compareFilteredString(buildXmlSpy.returnValues.shift(), '<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><objref>123</objref></Selection><Resultdef><member>bar</member></Resultdef></Query></Body></Envelope>');
        });

        it('accepts an array of ids', () => {
            sinon.stub(api, 'doRequest');

            api.findById([
                '123',
                234
            ], [
                'foo',
                'bar'
            ]);
            compareFilteredString(buildXmlSpy.returnValues.shift(), '<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><objref>123</objref><objref>234</objref></Selection><Resultdef><member>foo</member><member>bar</member></Resultdef></Query></Body></Envelope>');
        });

        it('replaces placeholders in fields', () => {
            sinon.stub(api, 'doRequest');

            api.findById(
                123456,
                {
                    id: 123,
                    date: '2015-09-21'
                },
                [
                    'normal-field :id',
                    {
                        alias: 'foobar-:id',
                        ocl:   'object.field-:date'
                    }
                ]
            );
            compareFilteredString(buildXmlSpy.returnValues.shift(), '<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><objref>123456</objref></Selection><Resultdef><member>normal-field 123</member><expression><alias>foobar-123</alias><ocl>object.field-2015-09-21</ocl></expression></Resultdef></Query></Body></Envelope>');
        });
    });

    describe('delete()', () => {
        it('accepts a number as parameter', () => {
            sinon.stub(api, 'doRequest');

            api.delete('123');
            compareFilteredString(buildXmlSpy.returnValues.shift(), '<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Delete><objref>123</objref></Delete></Body></Envelope>');

            api.delete(123);
            compareFilteredString(buildXmlSpy.returnValues.shift(), '<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Delete><objref>123</objref></Delete></Body></Envelope>');
        });

        it('accepts an array of ids', () => {
            sinon.stub(api, 'doRequest');

            api.delete([
                '123',
                234
            ]);
            compareFilteredString(buildXmlSpy.returnValues.shift(), '<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Delete><objref>123</objref><objref>234</objref></Delete></Body></Envelope>');
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
            compareFilteredString(buildXmlSpy.returnValues.shift(), '<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Create><OffeneLeistung><bearbeiter><objref>123</objref></bearbeiter><projekt><objref>234</objref></projekt><minutenint>60</minutenint></OffeneLeistung></Create></Body></Envelope>');
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
            compareFilteredString(buildXmlSpy.returnValues.shift(), '<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Create><OffeneLeistung><bearbeiter><objref>123</objref></bearbeiter><projekt><objref>234</objref></projekt><minutenint>60</minutenint></OffeneLeistung><SonstigeLeistung><phase><objref>345</objref></phase><minutenExt>30</minutenExt></SonstigeLeistung></Create></Body></Envelope>');
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
            compareFilteredString(buildXmlSpy.returnValues.shift(), '<?xml version="1.0" encoding="UTF-8"?><Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Create><OffeneLeistung><bearbeiter><objref>123</objref></bearbeiter><projekt><objref>234</objref></projekt><minutenint>60</minutenint></OffeneLeistung></Create><Update><VerrechneteLeistung><objref>987</objref><phase><objref>345</objref></phase><minutenExt>30</minutenExt></VerrechneteLeistung></Update></Body></Envelope>');
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
