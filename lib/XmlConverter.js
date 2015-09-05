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
     * @param {string} key Object key
     * @param {string|array|object} value Object value
     *
     * @return {string} XML string result
     */
    processEntry(key, value) {
        var xml = [];

        if (_.isPlainObject(value)) {
            xml.push(this.createNode(key, this.convert(value)));
        } else if (_.isArray(value)) {
            value.forEach((item) => {
                if (_.isPlainObject(item)) {
                    xml.push(this.createNode(key, this.convert(item)));
                } else {
                    xml.push(this.createNode(key, item));
                }
            });
        } else {
            xml.push(this.createNode(key, value));
        }

        return xml.join('');
    }

    /**
     * Creates a single xml node
     *
     * @param {string} key Node identifier
     * @param {string} value Node content
     *
     * @return {string} XML string result
     */
    createNode(key, value) {
        return `<${key}>${value}</${key}>`;
    }
}
