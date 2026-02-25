import ParamsInjector from '../lib/simple-parameter-injector.js';
import {expect} from 'chai';
import sinon from 'sinon';

describe('ParamsInjector', () => {
    it('Replaces one ? placeholder with a string/number', () => {
        const given = 'where-x-expression = ?';
        let params = 123;
        let expected = 'where-x-expression = 123';

        expect(ParamsInjector.inject(given, params)).to.equal(expected);

        params = '234';
        expected = 'where-x-expression = 234';

        expect(ParamsInjector.inject(given, params)).to.equal(expected);
    });

    it('Replaces ? placeholder with string/number values from an array', () => {
        const given = 'where-x-expression = ? and where-y-expression = ?';
        let params = [123];
        let expected = 'where-x-expression = 123 and where-y-expression = ?';

        expect(ParamsInjector.inject(given, params)).to.equal(expected);

        params = [
            123,
            '234'
        ];
        expected = 'where-x-expression = 123 and where-y-expression = 234';

        expect(ParamsInjector.inject(given, params)).to.equal(expected);
    });

    it('returns ? placeholder if more placeholders then params in number/string or array given', () => {
        const given = 'where-x-expression = ? and where-y-expression = ?';
        let params = [123];
        let expected = 'where-x-expression = 123 and where-y-expression = ?';

        expect(ParamsInjector.inject(given, params)).to.equal(expected);

        params = 123;
        expected = 'where-x-expression = 123 and where-y-expression = ?';

        expect(ParamsInjector.inject(given, params)).to.equal(expected);

        params = '234';
        expected = 'where-x-expression = 234 and where-y-expression = ?';

        expect(ParamsInjector.inject(given, params)).to.equal(expected);
    });

    it('Replaces one named parameter with string/number values from an object', () => {
        const given = 'where-x-expression = :x';
        let params = {
            x: 123
        };
        let expected = 'where-x-expression = 123';

        expect(ParamsInjector.inject(given, params)).to.equal(expected);

        params = {
            x: '234'
        };
        expected = 'where-x-expression = 234';

        expect(ParamsInjector.inject(given, params)).to.equal(expected);
    });

    it('Replaces multiple named parameters with string/number values from an object', () => {
        const given = 'where-x-expression = :x and where-y-expression = :y';
        const params = {
            x: 123,
            y: '234'
        };
        const expected = 'where-x-expression = 123 and where-y-expression = 234';

        expect(ParamsInjector.inject(given, params)).to.equal(expected);
    });

    it('Replaces multiple named parameters with string/number values from an object when given an object', () => {
        const given = {
            item1: 'where-x-expression = :x',
            item2: 'where-y-expression = :y'
        };
        const params = {
            x: 123,
            y: '234'
        };
        const expected = {
            item1: 'where-x-expression = 123',
            item2: 'where-y-expression = 234'
        };

        expect(ParamsInjector.inject(given, params)).to.deep.equal(expected);
    });

    it('Replaces multiple named parameters with string/number values from an object when given an array of strings and objects', () => {
        const given = [
            'where-x-expression = :x',
            {
                subitem: 'where-y-expression = :y'
            }
        ];
        const params = {
            x: 123,
            y: '234'
        };
        const expected = [
            'where-x-expression = 123',
            {
                subitem: 'where-y-expression = 234'
            }
        ];

        expect(ParamsInjector.inject(given, params)).to.deep.equal(expected);
    });

    it('throws an error if named parameter does not exist in params object', () => {
        const injectionSpy = sinon.spy(ParamsInjector, 'inject');

        const given = 'where-x-expression = :id and where-y-expression = :name';
        const params = {
            id: 123
        };
        const expected = 'where-x-expression = 123 and where-y-expression = ?';

        try {
            expect(ParamsInjector.inject(given, params)).to.equal(expected);
        } catch (e) {
            // we only need the finally block
        } finally {
            expect(injectionSpy.exceptions).to.have.length(1);
            expect(injectionSpy.exceptions.shift().message).to.have.string('1438415385');
        }
    });

    it('ignores empty param argument', () => {
        const given = 'where-x-expression = 123 and where-y-expression = 234';
        const expected = 'where-x-expression = 123 and where-y-expression = 234';

        expect(ParamsInjector.inject(given, undefined)).to.equal(expected);
        expect(ParamsInjector.inject(given, null)).to.equal(expected);
    });

    it('returns target as it is if it\'s not a string or object', () => {
        expect(ParamsInjector.inject(123, 123)).to.equal(123);
        expect(ParamsInjector.inject(null, 123)).to.equal(null);
    });

    it('does not modify params parameter if parameter is an object', () => {
        const given = [
            'where-x-expression = :x',
            {
                subitem: 'where-y-expression = :y'
            }
        ];
        const params = {
            x: 123,
            y: '234'
        };

        ParamsInjector.inject(given, params);

        expect(params.x).to.equal(123);
        expect(params.y).to.equal('234');
    });

    it('does not modify params parameter if parameter is an array', () => {
        const given = [
            'where-x-expression = ?',
            {
                subitem: 'where-y-expression = ?'
            }
        ];
        const params = [123, '234'];

        ParamsInjector.inject(given, params);

        expect(params.length).to.equal(2);
        expect(params[0]).to.equal(123);
        expect(params[1]).to.equal('234');
    });

    it('handles falsy named param values: 0, false, empty string', () => {
        const given = 'x = :a, y = :b, z = :c';
        const params = { a: 0, b: false, c: '' };
        const expected = 'x = 0, y = false, z = ';

        expect(ParamsInjector.inject(given, params)).to.equal(expected);
    });

    it('ignores extra positional params when fewer placeholders exist', () => {
        const given = 'x = ?';
        const params = [123, 234, 345];
        const expected = 'x = 123';

        expect(ParamsInjector.inject(given, params)).to.equal(expected);
    });

    it('returns empty string target unchanged', () => {
        expect(ParamsInjector.inject('', {x: 1})).to.equal('');
        expect(ParamsInjector.inject('', [1])).to.equal('');
    });
});
