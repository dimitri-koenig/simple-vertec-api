import XmlConverter from '../lib/simple-xml-converter.js';
import {expect} from 'chai';

describe('XmlConverter', () => {
    it('converts an object into an xml string', function () {
        var obj = {
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
        var xml = '<?xml version="1.0" encoding="UTF-8"?><firstEntries><entry><value>Entry 1</value></entry><entry><value>Entry 2</value></entry><entry><value>Entry 3</value></entry></firstEntries><secondEntries><entry><value>Entry 1</value></entry><entry><value>Entry 2</value></entry><entry><value>Entry 3</value></entry></secondEntries>';
        var result = XmlConverter.toXml(obj);
        expect(result).to.equal(xml);
    });

    it('ignores an empty object', function () {
        var obj = {
            'entries': {
                'entry': [
                    { 'value': 'Entry 1' },
                    { 'value': 'Entry 2' },
                    { 'value': 'Entry 3' }
                ]
            },
            entries2:  {}
        };
        var xml = '<?xml version="1.0" encoding="UTF-8"?><entries><entry><value>Entry 1</value></entry><entry><value>Entry 2</value></entry><entry><value>Entry 3</value></entry></entries>';
        var result = XmlConverter.toXml(obj);
        expect(result).to.equal(xml);
    });

    it('ignores an object with empty arrays', function () {
        var obj = {
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
        var xml = '<?xml version="1.0" encoding="UTF-8"?><entries><entry><value>Entry 1</value></entry><entry><value>Entry 2</value></entry><entry><value>Entry 3</value></entry></entries>';
        var result = XmlConverter.toXml(obj);
        expect(result).to.equal(xml);
    });

    it('converts an arrays into an xml string', function () {
        var obj = {
            'entries': {
                'entry': [
                    'Entry 1',
                    'Entry 2',
                    'Entry 3'
                ]
            }
        };
        var xml = '<?xml version="1.0" encoding="UTF-8"?><entries><entry>Entry 1</entry><entry>Entry 2</entry><entry>Entry 3</entry></entries>';
        var result = XmlConverter.toXml(obj);
        expect(result).to.equal(xml);
    });

    it('ignores an empty array', function () {
        var obj = {
            'entries': {
                'entry': [
                    'Entry 1',
                    'Entry 2',
                    'Entry 3'
                ]
            },
            entries2:  []
        };
        var xml = '<?xml version="1.0" encoding="UTF-8"?><entries><entry>Entry 1</entry><entry>Entry 2</entry><entry>Entry 3</entry></entries>';
        var result = XmlConverter.toXml(obj);
        expect(result).to.equal(xml);
    });

    it('escapes special chars in arrays properly', () => {
        var obj = {
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
        var xml = '<?xml version="1.0" encoding="UTF-8"?><checkInArray><entries>&apos;Entry 1&apos;</entries><entries>&apos;Entry 2&apos;</entries><entries>1 &lt; 2</entries><entries>2 &gt; 1</entries><entries>1 &amp; 2</entries></checkInArray>';
        var result = XmlConverter.toXml(obj);
        expect(result).to.equal(xml);
    });

    it('escapes special chars in objects properly', () => {
        var obj = {
            checkInObject:  {
                quote: '"Entry 1"',
                doublequote: '\'Entry 2\'',
                lesserThan: '1 < 2',
                greaterThen: '2 > 1',
                and: '1 & 2'
            }
        };
        var xml = '<?xml version="1.0" encoding="UTF-8"?><checkInObject><quote>&apos;Entry 1&apos;</quote><doublequote>&apos;Entry 2&apos;</doublequote><lesserThan>1 &lt; 2</lesserThan><greaterThen>2 &gt; 1</greaterThen><and>1 &amp; 2</and></checkInObject>';
        var result = XmlConverter.toXml(obj);
        expect(result).to.equal(xml);
    });

    it('handles numbers and other property types properly', () => {
        var obj = {
            typeChecks:  {
                integerCheck: 1,
                floatCheck: 1.2,
                nullShouldBeIgnored: null,
                undefinedShouldBeIgnored: undefined
            }
        };
        var xml = '<?xml version="1.0" encoding="UTF-8"?><typeChecks><integerCheck>1</integerCheck><floatCheck>1.2</floatCheck></typeChecks>';
        var result = XmlConverter.toXml(obj);
        expect(result).to.equal(xml);
    });

    it('indents properly', () => {
        var obj = {
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
        var xml = `<?xml version="1.0" encoding="UTF-8"?>
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
        var result = XmlConverter.toXml(obj, 4);
        expect(result).to.equal(xml);
    });
});
