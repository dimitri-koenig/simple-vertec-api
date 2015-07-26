'use strict';

process.env.NODE_ENV = 'test';

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

    it('sets members and expressions', function () {
        sinon.stub(api, 'request').resolves('<Envelope><Body><QueryResponse><Kontakt><objid>12345</objid><sprache>DE</sprache></Kontakt><Kontakt><objid>23456</objid><sprache>EN</sprache></Kontakt></QueryResponse></Body></Envelope>');

        api.query({ select: 'something' }).then(function (content) {
            expect(content.Kontakt.length).to.equal(2);
            expect(content.Kontakt[0].objid).to.equal('12345');
            expect(content.Kontakt[0].sprache).to.equal('DE');
            expect(content.Kontakt[1].objid).to.equal('23456');
            expect(content.Kontakt[1].sprache).to.equal('EN');
        });
    });
});
