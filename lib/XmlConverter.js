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
        return (new XmlConverter()).convert(object);
    }

    /**
     * Converts an object to an xml string
     *
     * @param {object} object The source object
     *
     * @return {string} XML string result
     */
    convert(object) {
        var xmlStringParts = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            this.convertObject(object)
        ];

        return xmlStringParts.join('');
    }

    /**
     * Processes an object
     *
     * @private
     *
     * @param {object} object The source object
     *
     * @return {string} XML string result
     */
    convertObject(object) {
        var xml = [];

        _.forOwn(object, (value, key) => {
            if (_.isNumber(value) || !_.isEmpty(value)) {
                xml.push(this.processObjectProperty(key, value));
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
    processObjectProperty(key, value) {
        if (_.isPlainObject(value)) {
            var convertedObject = this.convertObject(value);
            return !_.isEmpty(convertedObject) ? this.createNode(key, convertedObject) : '';
        }

        if (_.isArray(value)) {
            return this.convertArray(key, value);
        }

        return this.createNode(key, this.escapeValue(value));
    }

    /**
     * Processes an array
     *
     * @private
     *
     * @param {string} key The xml node key
     * @param {array} arr The source array
     *
     * @return {string} XML string result
     */
    convertArray(key, arr) {
        var xml = [];

        _.each(arr, (item) => {
            if (_.isPlainObject(item)) {
                return xml.push(this.createNode(key, this.convertObject(item)));
            }

            return xml.push(this.createNode(key, item));
        });

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
     * @param {string} str The target string value
     *
     * @return {string} Escaped string
     */
    escapeValue(str) {
        return !_.isString(str) ? str : str.replace(/[<>&'"]/g, (char) => {
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
