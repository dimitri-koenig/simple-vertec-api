import ParamsInjector from '../lib/ParamsInjector';
import {expect} from 'chai';
import sinon from 'sinon';

describe('ParamsInjector', () => {
    it('Replaces one ? placeholder with a string/number', () => {
        var given = 'where-x-expression = ?';
        var params = 123;
        var expected = 'where-x-expression = 123';

        expect(ParamsInjector.inject(given, params)).to.equal(expected);

        params = '234';
        expected = 'where-x-expression = 234';

        expect(ParamsInjector.inject(given, params)).to.equal(expected);
    });

    it('Replaces ? placeholder with string/number values from an array', () => {
        var given = 'where-x-expression = ? and where-y-expression = ?';
        var params = [123];
        var expected = 'where-x-expression = 123 and where-y-expression = ?';

        expect(ParamsInjector.inject(given, params)).to.equal(expected);

        params = [
            123,
            '234'
        ];
        expected = 'where-x-expression = 123 and where-y-expression = 234';

        expect(ParamsInjector.inject(given, params)).to.equal(expected);
    });

    it('returns ? placeholder if more placeholders then params in number/string or array given', () => {
        var given = 'where-x-expression = ? and where-y-expression = ?';
        var params = [123];
        var expected = 'where-x-expression = 123 and where-y-expression = ?';

        expect(ParamsInjector.inject(given, params)).to.equal(expected);

        params = 123;
        expected = 'where-x-expression = 123 and where-y-expression = ?';

        expect(ParamsInjector.inject(given, params)).to.equal(expected);

        params = '234';
        expected = 'where-x-expression = 234 and where-y-expression = ?';

        expect(ParamsInjector.inject(given, params)).to.equal(expected);
    });

    it('Replaces one named parameter with string/number values from an object', () => {
        var given = 'where-x-expression = :x';
        var params = {
            x: 123
        };
        var expected = 'where-x-expression = 123';

        expect(ParamsInjector.inject(given, params)).to.equal(expected);

        params = {
            x: '234'
        };
        expected = 'where-x-expression = 234';

        expect(ParamsInjector.inject(given, params)).to.equal(expected);
    });

    it('Replaces multiple named parameters with string/number values from an object', () => {
        var given = 'where-x-expression = :x and where-y-expression = :y';
        var params = {
            x: 123,
            y: '234'
        };
        var expected = 'where-x-expression = 123 and where-y-expression = 234';

        expect(ParamsInjector.inject(given, params)).to.equal(expected);
    });

    it('throws an error if named parameter does not exist in params object', () => {
        var injectionSpy = sinon.spy(ParamsInjector, 'inject');

        var given = 'where-x-expression = :id and where-y-expression = :name';
        var params = {
            id: 123
        };
        var expected = 'where-x-expression = 123 and where-y-expression = ?';

        try {
            expect(ParamsInjector.inject(given, params)).to.equal(expected);
        } catch (e) {
            // we only need the finally block
        } finally {
            expect(injectionSpy.exceptions).to.have.length(1);
            expect(injectionSpy.exceptions.shift().message).to.have.string('1438415385');
        }
    });
});
