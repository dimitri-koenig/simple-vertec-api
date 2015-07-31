'use strict';

var SimpleVertecApi = require('../lib/simple-vertec-api').SimpleVertecApi,
    expect          = require('chai').expect,
    sinon           = require('sinon-bluebird');

describe('SimpleVertecApi', function () {
    var api,
        buildXmlSpy;

    beforeEach('setup', function () {
        api = new SimpleVertecApi('http://localhost', 'my-username', 'my-password');
        buildXmlSpy = sinon.spy(api, 'buildXml');
    });

    it('sets authentication data', function () {
        sinon.stub(api, 'doRequest');

        api.query({ select: 'something' });
        expect(buildXmlSpy.returnValues[0]).to.equal('<Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>something</ocl></Selection></Query></Body></Envelope>');
    });

    it('does two requests with same auth data', function () {
        sinon.stub(api, 'doRequest');

        api.query({ select: 'something' });
        expect(buildXmlSpy.returnValues[0]).to.equal('<Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>something</ocl></Selection></Query></Body></Envelope>');

        api.query({ select: 'something else' });
        expect(buildXmlSpy.returnValues[1]).to.equal('<Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>something else</ocl></Selection></Query></Body></Envelope>');
    });

    it('throws an error when no select given', function () {
        sinon.stub(api, 'doRequest');
        var querySpy = sinon.spy(api, 'query');

        try {
            api.query({});
        } catch (e) {
            // we only need the finally block
        } finally {
            expect(querySpy.exceptions).to.have.length(1);
            expect(querySpy.exceptions[0].message).to.have.string('1437846575');
        }
    });

    it('sets members and expressions', function () {
        sinon.stub(api, 'doRequest');

        api.query({
            select: 'something',
            fields: [
                'normal-field',
                {
                    alias: 'foobar',
                    ocl:   'object.field'
                }
            ]
        });
        expect(buildXmlSpy.returnValues[0]).to.equal('<Envelope><Header><BasicAuth><Name>my-username</Name><Password>my-password</Password></BasicAuth></Header><Body><Query><Selection><ocl>something</ocl></Selection><Resultdef><member>normal-field</member><expression><alias>foobar</alias><ocl>object.field</ocl></expression></Resultdef></Query></Body></Envelope>');
    });

    it('throws an error on an unknown field config type', function () {
        sinon.stub(api, 'doRequest');

        try {
            api.query({
                select: 'something',
                fields: [
                    123
                ]
            });
        } catch (e) {
            // we only need the finally block
        } finally {
            expect(buildXmlSpy.exceptions).to.have.length(1);
            expect(buildXmlSpy.exceptions[0].message).to.have.string('1437849815');
        }
    });

    it('converts response to json and extracts useful content', function () {
        sinon.stub(api, 'request').resolves('<Envelope><Body><QueryResponse><Kontakt><objid>12345</objid><sprache>DE</sprache></Kontakt><Kontakt><objid>23456</objid><sprache>EN</sprache></Kontakt></QueryResponse></Body></Envelope>');

        return api.query({ select: 'something' }).then(function (content) {
            expect(content.Kontakt.length).to.equal(2);
            expect(content.Kontakt[0].objid).to.equal('12345');
            expect(content.Kontakt[0].sprache).to.equal('DE');
            expect(content.Kontakt[1].objid).to.equal('23456');
            expect(content.Kontakt[1].sprache).to.equal('EN');
        });
    });

    it('converts fault messages from server', function () {
        sinon.stub(api, 'request').resolves('<Envelope><Body><Fault><faultcode>Client</faultcode></Fault></Body></Envelope>');

        return api.query({ select: 'some faulty select' }).then(function (result) {
            throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
        }, function (result) {
            expect(result).to.include.keys('Fault');
        });
    });
});
