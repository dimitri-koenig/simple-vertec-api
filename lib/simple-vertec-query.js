import _ from 'lodash';
import md5 from 'md5';
import q from 'bluebird';

/**
 * Simple Vertec Query
 *
 * @return {object} SimpleVertecQuery
 */
export class SimpleVertecQuery {
    /**
     * Sets global api for every instance
     *
     * @param {SimpleVertecApi} api An instance of SimpleVertecApi
     *
     * @return {void}
     */
    static setApi(api) {
        this.api = api;
    }

    /**
     * Sets global cache instance of memcached for every instance
     *
     * @param {memcached} cache An instance of memcached
     *
     * @return {void}
     */
    static setMemcached(cache) {
        this.cache = cache;
    }

    /**
     * Sets global app cache key for every instance
     *
     * @param {string} appCacheKey App cache key
     *
     * @return {void}
     */
    static setAppCacheKey(appCacheKey) {
        this.appCacheKey = appCacheKey;
    }

    /**
     * Constructor
     *
     * Sets default properties and optionally overwrites them
     *
     * @param {object} overwriteOptions Overwrite options
     *
     * @return {object} SimpleVertecQuery
     */
    constructor(overwriteOptions) {
        this.options = {
            query: {},
            params: [],
            fields: [],

            cacheKey: null,
            cacheTTL: 0,
            cacheGraceTime: 0,

            transformer: [],
            propertyFilter: null,
            rootKey: 'data',

            useParallelMode: false
        };

        _.extend(this.options, _.cloneDeep(overwriteOptions));
    }

    /**
     * Finds one or many ids
     *
     * @param {number[]} ids One id or an array of ids
     *
     * @return {object} SimpleVertecQuery
     */
    findById(ids) {
        this.options.query.objref = ids;

        return this;
    }

    /**
     * Adds ocl expression to select
     *
     * @param {string} ocl Ocl expression
     *
     * @return {object} SimpleVertecQuery
     */
    whereOcl(ocl) {
        this.options.query.ocl = ocl;

        return this;
    }

    /**
     * Adds sql where expression to select
     *
     * @param {string} sql Sql where expression
     *
     * @return {object} SimpleVertecQuery
     */
    whereSql(sql) {
        this.options.query.sqlwhere = sql;

        return this;
    }

    /**
     * Adds order expression
     *
     * @param {string} order Order expression
     *
     * @return {object} SimpleVertecQuery
     */
    orderBy(order) {
        this.options.query.sqlorder = order;

        return this;
    }

    /**
     * Adds param value for injecting into fields (only as object) and select expressions
     *
     * @param {mixed} value Parameter
     *
     * @return {object} SimpleVertecQuery
     */
    addParam(value) {
        if (!_.isPlainObject(value)) {
            this.options.params.push(value);
        }

        if (_.isPlainObject(value)) {
            this.options.params = _.extend({}, this.options.params, value);
        }

        return this;
    }

    /**
     * Adds param values for injecting into fields (only as object) and select expressions
     *
     * Either the first argument is an array containing parameters
     * or every every argument is an parameter
     *
     * @return {object} SimpleVertecQuery
     */
    addParams() {
        this.options.params.push(...arguments);

        return this;
    }

    /**
     * Adds one field to field array
     *
     * @param {string|object} value Either a string with the field or an object containing ocl and alias expressions
     * @param {string} alias Optional alias string if value is a string containing an ocl expression
     *
     * @return {object} SimpleVertecQuery
     */
    addField(value, alias) {
        let newField = _.isUndefined(alias) || _.isPlainObject(value) ? value : {ocl: value, alias};

        this.options.fields.push(newField);

        return this;
    }

    /**
     * Adds multiple fields to field array
     *
     * Either the first argument is an array containing fields
     * or every every argument (either a string or object) is a field
     *
     * @return {object} SimpleVertecQuery
     */
    addFields() {
        let args = _.isArray(arguments[0]) ? arguments[0] : arguments;

        this.options.fields.push(...args);

        return this;
    }

    /**
     * Sets cache duration time in seconds and thus activates caching
     *
     * @param {number} seconds Seconds for item to be in cache
     *
     * @return {object} SimpleVertecQuery
     */
    setCacheTTL(seconds) {
        this.options.cacheTTL = seconds;

        return this;
    }

    /**
     * Additional grace seconds for item to remain in cache while it's getting renewed
     *
     * @param {number} seconds Seconds for item to be additionally in cache
     *
     * @return {object} SimpleVertecQuery
     */
    setCacheGraceTime(seconds) {
        this.options.cacheGraceTime = seconds;

        return this;
    }

    /**
     * Sets optional cache key for that cache entry
     *
     * If no cache key for that select defined a md5 hash of the whole request xml will be used
     *
     * @param {string} value Item cache key
     *
     * @return {object} SimpleVertecQuery
     */
    setCacheKey(value) {
        this.options.cacheKey = value;

        return this;
    }

    /**
     * Adds a transformer function which will be called after a request returns a response
     *
     * Each transformer closure should return the transformed value
     *
     * @param {function} transformer Transformer function
     *
     * @return {object} SimpleVertecQuery
     */
    addTransformer(transformer) {
        this.options.transformer.push(transformer);

        return this;
    }

    /**
     * Sets a property filter which extracts the result for the specific property
     *
     * @param {string} key Property key to extract
     * @param {boolean} toArray Optionally converts value to an array
     *
     * @return {object} SimpleVertecQuery
     */
    filterProperty(key, toArray = false) {
        this.options.propertyFilter = {key, toArray};

        return this;
    }

    /**
     * Sets optional root key for data to be capsuled
     *
     * @param {string} newKey New root key
     *
     * @return {object} SimpleVertecQuery
     */
    setRootKey(newKey) {
        this.options.rootKey = newKey;

        return this;
    }

    /**
     * Zips together the properties of the property at path's position
     *
     * Wildcards using '*' are allowed too
     *
     * @param {string} path Path to the object property
     * @param {null|string} keyToCheck Uses key to check wether result is a valid object
     * @param {boolean} forceArray Forces path to become an array
     *
     * @return {object} SimpleVertecQuery
     */
    zip(path, keyToCheck = null, forceArray = true) {
        this.addZipTransformer(path, keyToCheck, forceArray);

        return this;
    }

    /**
     * Toggles parallel fetching mode of multiple objrefs
     *
     * @param {boolean} value Sets parallel mode
     *
     * @return {object} SimpleVertecQuery
     */
    inParallel(value = true) {
        this.options.useParallelMode = value;

        return this;
    }

    /**
     * Sends a request with all settings and returns response
     *
     * Optionally puts it into cache and does some transformation.
     * Optionally sends multiple requests with same options in parallel.
     *
     * Example: take a look at the README file
     *
     * @param {boolean} refresh Forces a new request
     *
     * @return {Promise} Promise for the request
     */
    get(refresh = false) {
        if (this.options.useParallelMode && this.options.query.objref) {
            let ids = _.isArray(this.options.query.objref) ? _.clone(this.options.query.objref) : [this.options.query.objref];

            return q.map(ids, id => {
                return new SimpleVertecQuery(this.options).inParallel(false).findById(id).get(refresh);
            });
        }

        return new q((resolve, reject) => {
            if (SimpleVertecQuery.cache && this.options.cacheTTL > 0) {
                let cacheKey = this.getCacheKey();
                let currentTime = new Date().getTime();

                return SimpleVertecQuery.cache.get(cacheKey, (err, cacheData) => {
                    if (err) {
                        return reject(err);
                    }

                    if (!refresh && _.isPlainObject(cacheData) && !_.isEmpty(cacheData)) {
                        cacheData.meta.onGrace = cacheData.meta.softExpire > 0 && currentTime > cacheData.meta.softExpire;
                        cacheData.meta.refresh = false;

                        resolve(cacheData);

                        if (!cacheData.meta.onGrace) {
                            return;
                        }
                    }

                    this.makeRequest().then(
                        result => {
                            let cacheDuration = this.options.cacheTTL + this.options.cacheGraceTime;

                            result.meta = {
                                cacheDateTime: currentTime,
                                softExpire: currentTime + this.options.cacheTTL*1000,
                                onGrace: false
                            };

                            SimpleVertecQuery.cache.set(
                                cacheKey,
                                result,
                                cacheDuration,
                                /* istanbul ignore next: makes no sense to test this */
                                () => {}
                            );

                            result.meta.refresh = refresh;

                            resolve(result);
                        },
                        err => {
                            reject(err);
                        }
                    );
                });
            }

            this.makeRequest().then(
                result => {
                    resolve(result);
                },
                err => {
                    reject(err);
                }
            );
        });
    }

    /**
     * Compiles cache key
     *
     * @private
     *
     * @return {string} Cache key
     */
    getCacheKey() {
        let cacheKey = [
            (SimpleVertecQuery.appCacheKey ? SimpleVertecQuery.appCacheKey : 'svq'),
            (this.options.cacheKey ? this.options.cacheKey : md5(SimpleVertecQuery.api.buildSelectString(this.options.query, this.options.params, this.options.fields))),
            this.options.cacheTTL
        ];

        // if only one id given which e.g. is used in parallel mode it should be included in cache key
        // otherwise the same cache key would be used for different ids
        if (this.options.cacheKey && _.isNumber(this.options.query.objref)) {
            cacheKey.push(this.options.query.objref);
        }

        return cacheKey.join('-');
    }

    /**
     * Makes the actual request and some optional transformations
     *
     * @private
     *
     * @return {Promise} The actual request
     */
    makeRequest() {
        let request = SimpleVertecQuery.api.select(this.options.query, this.options.params, this.options.fields);

        this.addFilterPropertiesTransformer();
        request = this.runThroughTransformers(request);

        return request.then(response => {
            let result = {
                [this.options.rootKey]: response
            };

            return result;
        });
    }

    /**
     * Adds an transformer if property filter defined
     *
     * @private
     *
     * @return {void}
     */
    addFilterPropertiesTransformer() {
        if (this.options.propertyFilter) {
            this.options.transformer.unshift(response => {
                let newResponse = response[this.options.propertyFilter.key];

                if (this.options.propertyFilter.toArray && !_.isArray(newResponse)) {
                    newResponse = newResponse ? [newResponse] : [];
                }

                return newResponse;
            });
        }
    }

    /**
     * Adds zip transformers if zip paths defined
     *
     * @param {string} path Path to property to zip
     * @param {null|string} keyToCheck Uses key to check wether result is a valid object
     * @param {boolean} forceArray Forces path to become an array
     *
     * @private
     *
     * @return {void}
     */
    addZipTransformer(path, keyToCheck = null, forceArray = true) {
        this.options.transformer.push(response => {
            let targetPaths = this.getTargetPaths(response, path);

            _.each(targetPaths, targetPath => {
                let target = _.get(response, targetPath);

                if (_.isPlainObject(target)) {
                    let keys = _.keys(target);

                    if (_.isArray(target[keys[0]])) {
                        target = _.zipWith(..._.values(target), (...args) => {
                            return _.zipObject(keys, args);
                        });
                    } else {
                        target = [target];
                    }

                    if (!_.isNull(keyToCheck) && (_.isNull(target[0][keyToCheck]) || _.isUndefined(target[0][keyToCheck]))) {
                        target = [];
                    }

                    _.set(response, targetPath, target);
                } else if (!target && forceArray) {
                    _.set(response, targetPath, []);
                }
            });

            return response;
        });
    }

    /**
     * Checks path for wildcards and resolves them to their keys
     *
     * @param {object} obj Response object
     * @param {string} path Path
     *
     * @private
     *
     * @return {array} Array with expanded target paths
     */
    getTargetPaths(obj, path) {
        let targetPaths = [path];

        for (let i = 0; i < targetPaths.length; ++i) {
            let targetPath = targetPaths[i];

            if (!targetPath.match(/\*/)) {
                continue;
            }

            let parts = _.toPath(targetPath);
            let currentPath = '';

            _.each(parts, (part, partIndex) => { // eslint-disable-line no-loop-func
                if (part !== '*') {
                    currentPath += currentPath === '' ? part : '.' + part;
                } else {
                    let keys = _.keys(currentPath === '' ? obj : _.get(obj, currentPath));

                    _.each(keys, key => {
                        let rest = parts.slice(partIndex + 1).join('.');
                        let newPath = (currentPath === '' ? key : currentPath + '.' + key) + (rest ? '.' + rest : '');
                        targetPaths.push(newPath);
                    });

                    targetPaths[i] = null;
                }
            });
        }

        targetPaths = _.reject(targetPaths, _.isNull);

        return targetPaths;
    }

    /**
     * Runs all transformers through the current request
     *
     * @param {Promise} request The current request
     *
     * @private
     *
     * @return {Promise} The actual request
     */
    runThroughTransformers(request) {
        _.each(this.options.transformer, transformer => {
            request = request.then(transformer);
        });

        return request;
    }
}
