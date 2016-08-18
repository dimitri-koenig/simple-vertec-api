import _ from 'lodash';

export class SimpleVertecQuery {
    static setApi(api) {
        SimpleVertecQuery.api = api;
    }

    constructor(api) {
        this.api = api;

        this.query = {};
        this.params = [];
        this.fields = [];

        this.cacheTTL = 0;
        this.cacheGraceTime = 0;
        this.cacheAutoRefresh = true;
    }

    findById(id) {
        this.query.objref = id;

        return this;
    }

    whereOcl(ocl) {
        this.query.ocl = ocl;

        return this;
    }

    whereSql(sql) {
        this.query.sqlwhere = sql;

        return this;
    }

    orderBy(order) {
        this.query.sqlorder = order;

        return this;
    }

    addParam(value) {
        if (!_.isPlainObject(value)) {
            this.params.push(value);
        }

        if (_.isPlainObject(value)) {
            this.params = _.extend({}, this.params, value);
        }

        return this;
    }

    addParams() {
        this.params.push(...arguments);

        return this;
    }

    addField(value, alias) {
        let newField = _.isUndefined(alias) || _.isPlainObject(value) ? value : {ocl: value, alias};

        this.fields.push(newField);

        return this;
    }

    addFields() {
        this.fields.push(...arguments);

        return this;
    }

    get() {
        let api = !_.isUndefined(this.api) ? this.api : SimpleVertecQuery.api;

        return api.select(this.query, this.params, this.fields);
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
