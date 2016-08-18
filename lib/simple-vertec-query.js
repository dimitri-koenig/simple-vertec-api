import _ from 'lodash';

export class SimpleVertecQuery {
    constructor(api, verbose, defaultOptions) {
        this.api = api;
        this.verbose = verbose;
        this.defaultOptions = defaultOptions || {};

        this.query = {};
        this.params = [];
        this.fields = [];

        this.cacheTTL = 0;
        this.cacheGraceTime = 0;
        this.cacheAutoRefresh = true;
    }

    createSelectQuery() {
        return new SimpleVertecQuery(this.api, this.verbose, this.defaultOptions);
    }

    get() {
        return this.api.select(this.query, this.params, this.fields);
    }

    /**
     * Custom log method
     *
     * @private
     *
     * @return {void}
     */
    log() {
        if (this.verbose === true) {
            let content;
            for (let i = 0; i < arguments.length; i++) {
                content = !_.isString(arguments[i]) ? JSON.stringify(arguments[i], null, 4) : arguments[i];

                console.log(content); // eslint-disable-line no-console
            }
        }
    }
}
