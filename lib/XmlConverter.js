import _ from 'lodash';

export default class XmlConverter {
    /**
     * Converts an object to an xml string | static call
     *
     * @param {object} object The source object
     *
     * @return {string} XML string result
     */
    static toXml(object) {
        var xmlStringParts = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            (new XmlConverter()).convert(object)
        ];
        var xmlString = xmlStringParts.join('');

        return xmlString;
    }

    /**
     * Converts an object to an xml string
     *
     * @private
     *
     * @param {object} object The source object
     *
     * @return {string} XML string result
     */
    convert(object) {
        var xml = [];

        _.each(object, (value, key) => {
            if (object.hasOwnProperty(key)) {
                xml.push(this.processEntry(key, object[key]));
            }
        });

        return xml.join('');
    }

    /**
     * Processes an object property with its key
     *
     * @private
     *
     * @param {string} key Object key
     * @param {string|array|object} value Object value
     *
     * @return {string} XML string result
     */
    processEntry(key, value) {
        var xml = [];

        if (_.isPlainObject(value)) {
            if (_.size(value) > 0) {
                xml.push(this.createNode(key, this.convert(value)));
            }
        } else if (_.isArray(value)) {
            value.forEach((item) => {
                if (_.isPlainObject(item)) {
                    xml.push(this.createNode(key, this.convert(item)));
                } else {
                    xml.push(this.createNode(key, item));
                }
            });
        } else {
            xml.push(this.createNode(key, this.escapeValue(value)));
        }

        return xml.join('');
    }

    /**
     * Creates a single xml node
     *
     * @private
     *
     * @param {string} key Node identifier
     * @param {string} value Node content
     *
     * @return {string} XML string result
     */
    createNode(key, value) {
        return `<${key}>${value}</${key}>`;
    }

    /**
     * Escapes a string value for propper xml formatting
     *
     * @private
     *
     * @param {string} value The target string value
     *
     * @return {string} Escaped string
     */
    escapeValue(value) {
        return !_.isString(value) ? value : value.replace(/[<>&'"]/g, (char) => {
            switch (char) {
                /* eslint-disable */
                case '<':
                    return '&lt;';
                case '>':
                    return '&gt;';
                case '&':
                    return '&amp;';
                case '\'':
                    return '&apos;';
                case '"':
                    return '&apos;';
                /* eslint-enable */
            }
        });
    }
}