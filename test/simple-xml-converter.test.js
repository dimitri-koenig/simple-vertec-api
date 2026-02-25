import XmlConverter from '../lib/simple-xml-converter.js';
import {expect} from 'chai';

describe('XmlConverter', () => {
    it('converts an object into an xml string', function () {
        const obj = {
            'firstEntries':  {
                'entry': [
                    { 'value': 'Entry 1' },
                    { 'value': 'Entry 2' },
                    { 'value': 'Entry 3' }
                ]
            },
            'secondEntries': {
                'entry': [
                    { 'value': 'Entry 1' },
                    { 'value': 'Entry 2' },
                    { 'value': 'Entry 3' }
                ]
            }
        };
        const xml = '<?xml version="1.0" encoding="UTF-8"?><firstEntries><entry><value>Entry 1</value></entry><entry><value>Entry 2</value></entry><entry><value>Entry 3</value></entry></firstEntries><secondEntries><entry><value>Entry 1</value></entry><entry><value>Entry 2</value></entry><entry><value>Entry 3</value></entry></secondEntries>';
        const result = XmlConverter.toXml(obj);
        expect(result).to.equal(xml);
    });

    it('ignores an empty object', function () {
        const obj = {
            'entries': {
                'entry': [
                    { 'value': 'Entry 1' },
                    { 'value': 'Entry 2' },
                    { 'value': 'Entry 3' }
                ]
            },
            entries2:  {}
        };
        const xml = '<?xml version="1.0" encoding="UTF-8"?><entries><entry><value>Entry 1</value></entry><entry><value>Entry 2</value></entry><entry><value>Entry 3</value></entry></entries>';
        const result = XmlConverter.toXml(obj);
        expect(result).to.equal(xml);
    });

    it('ignores an object with empty arrays', function () {
        const obj = {
            'entries': {
                'entry': [
                    { 'value': 'Entry 1' },
                    { 'value': 'Entry 2' },
                    { 'value': 'Entry 3' }
                ]
            },
            entries2:  {
                'firstEntry':  [],
                'secondEntry': []
            }
        };
        const xml = '<?xml version="1.0" encoding="UTF-8"?><entries><entry><value>Entry 1</value></entry><entry><value>Entry 2</value></entry><entry><value>Entry 3</value></entry></entries>';
        const result = XmlConverter.toXml(obj);
        expect(result).to.equal(xml);
    });

    it('converts an arrays into an xml string', function () {
        const obj = {
            'entries': {
                'entry': [
                    'Entry 1',
                    'Entry 2',
                    'Entry 3'
                ]
            }
        };
        const xml = '<?xml version="1.0" encoding="UTF-8"?><entries><entry>Entry 1</entry><entry>Entry 2</entry><entry>Entry 3</entry></entries>';
        const result = XmlConverter.toXml(obj);
        expect(result).to.equal(xml);
    });

    it('ignores an empty array', function () {
        const obj = {
            'entries': {
                'entry': [
                    'Entry 1',
                    'Entry 2',
                    'Entry 3'
                ]
            },
            entries2:  []
        };
        const xml = '<?xml version="1.0" encoding="UTF-8"?><entries><entry>Entry 1</entry><entry>Entry 2</entry><entry>Entry 3</entry></entries>';
        const result = XmlConverter.toXml(obj);
        expect(result).to.equal(xml);
    });

    it('escapes special chars in arrays properly', () => {
        const obj = {
            checkInArray: {
                entries: [
                    '"Entry 1"',
                    '\'Entry 2\'',
                    '1 < 2',
                    '2 > 1',
                    '1 & 2'
                ]
            }
        };
        const xml = '<?xml version="1.0" encoding="UTF-8"?><checkInArray><entries>&apos;Entry 1&apos;</entries><entries>&apos;Entry 2&apos;</entries><entries>1 &lt; 2</entries><entries>2 &gt; 1</entries><entries>1 &amp; 2</entries></checkInArray>';
        const result = XmlConverter.toXml(obj);
        expect(result).to.equal(xml);
    });

    it('escapes special chars in objects properly', () => {
        const obj = {
            checkInObject:  {
                quote: '"Entry 1"',
                doublequote: '\'Entry 2\'',
                lesserThan: '1 < 2',
                greaterThen: '2 > 1',
                and: '1 & 2'
            }
        };
        const xml = '<?xml version="1.0" encoding="UTF-8"?><checkInObject><quote>&apos;Entry 1&apos;</quote><doublequote>&apos;Entry 2&apos;</doublequote><lesserThan>1 &lt; 2</lesserThan><greaterThen>2 &gt; 1</greaterThen><and>1 &amp; 2</and></checkInObject>';
        const result = XmlConverter.toXml(obj);
        expect(result).to.equal(xml);
    });

    it('handles numbers and other property types properly', () => {
        const obj = {
            typeChecks:  {
                integerCheck: 1,
                floatCheck: 1.2,
                nullShouldBeIgnored: null,
                undefinedShouldBeIgnored: undefined
            }
        };
        const xml = '<?xml version="1.0" encoding="UTF-8"?><typeChecks><integerCheck>1</integerCheck><floatCheck>1.2</floatCheck></typeChecks>';
        const result = XmlConverter.toXml(obj);
        expect(result).to.equal(xml);
    });

    it('indents properly', () => {
        const obj = {
            entriesObject: {
                entry: [
                    { value: 'Entry 1' },
                    { value: 'Entry 2' },
                    { value: 'Entry 3' }
                ]
            },
            entriesArray: {
                entry: [
                    'Entry 1',
                    'Entry 2',
                    'Entry 3'
                ]
            }
        };
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<entriesObject>
    <entry>
        <value>Entry 1</value>
    </entry>
    <entry>
        <value>Entry 2</value>
    </entry>
    <entry>
        <value>Entry 3</value>
    </entry>
</entriesObject>
<entriesArray>
    <entry>Entry 1</entry>
    <entry>Entry 2</entry>
    <entry>Entry 3</entry>
</entriesArray>`;
        const result = XmlConverter.toXml(obj, 4);
        expect(result).to.equal(xml);
    });

    it('drops boolean values silently (treated as empty by lodash)', () => {
        const obj = {
            typeChecks: {
                boolTrue: true,
                boolFalse: false,
                normalValue: 'hello'
            }
        };
        const xml = '<?xml version="1.0" encoding="UTF-8"?><typeChecks><normalValue>hello</normalValue></typeChecks>';
        const result = XmlConverter.toXml(obj);
        expect(result).to.equal(xml);
    });

    it('handles zero as a value (passes through via isNumber check)', () => {
        const obj = {
            container: {
                count: 0
            }
        };
        const xml = '<?xml version="1.0" encoding="UTF-8"?><container><count>0</count></container>';
        const result = XmlConverter.toXml(obj);
        expect(result).to.equal(xml);
    });

    it('drops empty string values', () => {
        const obj = {
            container: {
                empty: '',
                filled: 'data'
            }
        };
        const xml = '<?xml version="1.0" encoding="UTF-8"?><container><filled>data</filled></container>';
        const result = XmlConverter.toXml(obj);
        expect(result).to.equal(xml);
    });

    it('handles deeply nested objects (3+ levels)', () => {
        const obj = {
            level1: {
                level2: {
                    level3: {
                        level4: 'deep value'
                    }
                }
            }
        };
        const xml = '<?xml version="1.0" encoding="UTF-8"?><level1><level2><level3><level4>deep value</level4></level3></level2></level1>';
        const result = XmlConverter.toXml(obj);
        expect(result).to.equal(xml);
    });
});
