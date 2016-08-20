import _ from 'lodash';
import md5 from 'md5';
import q from 'bluebird';

export class SimpleVertecQuery {
    static setApi(api) {
        this.api = api;
    }

    static setMemcached(cache) {
        this.cache = cache;
    }

    static setAppCacheKey(appCacheKey) {
        this.appCacheKey = appCacheKey;
    }

    constructor() {
        this.query = {};
        this.params = [];
        this.fields = [];

        this.cacheKey = null;
        this.cacheTTL = 0;
        this.cacheGraceTime = 0;
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

    setCacheKey(value) {
        this.cacheKey = value;

        return this;
    }

    setCacheTTL(value) {
        this.cacheTTL = value;

        return this;
    }

    setCacheGraceTime(value) {
        this.cacheGraceTime = value;

        return this;
    }

    get(refresh = false) {
        return new q((resolve, reject) => {
            if (SimpleVertecQuery.cache && this.cacheTTL > 0) {
                let cacheKey = this.getCacheKey();
                let currentTime = new Date().getTime();

                return SimpleVertecQuery.cache.get(cacheKey, (err, cacheData) => {
                    if (err) {
                        return reject(err);
                    }

                    if (!refresh && _.isPlainObject(cacheData) && !_.isEmpty(cacheData)) {
                        cacheData.onGrace = cacheData.softExpire > 0 && currentTime > cacheData.softExpire;
                        cacheData.refresh = false;

                        if (cacheData.onGrace) {
                            resolve(cacheData);
                        } else {
                            return resolve(cacheData);
                        }
                    }

                    SimpleVertecQuery.api.select(this.query, this.params, this.fields).then(response => {
                        let cacheDuration = this.cacheTTL + this.cacheGraceTime;

                        let result = {
                            cacheDateTime: currentTime,
                            softExpire: this.cacheTTL ? (currentTime + this.cacheTTL*1000) : 0,
                            onGrace: false,
                            data: response
                        };

                        SimpleVertecQuery.cache.set(cacheKey, result, cacheDuration, () => {});

                        result.refresh = refresh;

                        resolve(result);
                    }).catch(e => {
                        reject(e);
                    });
                });
            }

            SimpleVertecQuery.api.select(this.query, this.params, this.fields).then(response => {
                let result = {
                    data: response
                };

                resolve(result);
            }).catch(e => {
                reject(e);
            });
        });
    }

    getCacheKey() {
        let cacheKey = [
            (SimpleVertecQuery.appCacheKey ? SimpleVertecQuery.appCacheKey : 'svq'),
            (this.cacheKey ? this.cacheKey : md5(SimpleVertecQuery.api.buildSelectString(this.query, this.params, this.fields)))
        ];

        return cacheKey.join('-');
    }
}
