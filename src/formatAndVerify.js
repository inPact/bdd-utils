// TODO: separate into format.js and verify.js
const assert = require('assert');
const expect = require('chai').expect;
const should = require('chai').should();
const Promise = require('bluebird');
const moment = require('moment-timezone');
const chalk = require('chalk');
const JSON5 = require('json5');
const xml2js = require('xml2js');

const compare = require('./compare');
const parse = require('./parse');
const { Stubber } = require('./stubber');
const utility = require('@tabit/utils');
const _ = utility.moredash;

const resolveExpressionRegex = /{{(.*)}}/;
/** @see https://regex101.com/r/4TYH3y/1 for details on this regex */
const resolveEntityRegex = /(?:"(.+)"|\((.+)\))\.(\w+)/;
const valueAndEntityResolverRegex = /\[(.+)\](?:"(.+)"|\((.+)\))\.(\w+)/;
const valueResolverRegex = /\[(.+)\]/;
const regexRegex = /^\/(.*)\/$/;
const floatRegex = /^-?\d+\.?\d*$/;
const pathSeparatorsRegex = /[.\[]/;
const localDateRegex = /^\[([\w_]+\/[\w_]+)\]\s+(.*)/;
const currencyRegex = /^\$-?\d+\.?\d{0,2}$/;

const xmlParser = new xml2js.Parser({ explicitArray: false });

const EntityResolver = {
    _resolvers: {},

    register(keys, resolver) {
        [].concat(keys).forEach(key => this._resolvers[key] = resolver);
    },

    getValueResolver(key) {
        return this._resolvers[key];
    }
};

const self = {
    entityResolver: EntityResolver,
    compare: compare,
    parse: parse,
    Stubber: Stubber,

    verifyEqual(existing, newObj, done) {
        let error = null;
        if (!_.isMatch(existing, newObj))
            error = new Error(`new entity conflicts with existing one.\r\nExisting: ${_.stringify(existing)}\r\nNew: ${_.stringify(newObj)}`);

        if (done)
            return done(error, existing);

        else if (error)
            throw error;
    },

    assertObjectIncludes(fullObject, propertySubset, message) {
        expect(_.toPairs(fullObject), message || `${JSON.stringify(fullObject)} do not include ${JSON.stringify(propertySubset)}`).to.deep.include.members(_.toPairs(propertySubset));
    },

    /**
     * Checks that @object includes @subset. Nulls in @subset must be null in @object. Fields in subset
     * with the value '**' are ignored.
     * @param object
     * @param subset
     * @param formatSubset
     * @param context
     * @param matchNulls
     * @returns {boolean}
     */
    objectsMatch(object, subset, formatSubset, context, { matchNulls = false } = {}) {
        if (formatSubset && context)
            subset = this.formatExpectedObject(subset, context);

        let nullsDictionary = _.filterObject(_.flattenObject(subset), (v) => v === null);
        let nonEmptyFields = _.keys(nullsDictionary).filter(k => _.get(object, k) != null);

        if (nonEmptyFields.length)
            return false;

        _.keys(nullsDictionary).forEach(k => _.unset(subset, k));

        return _.isMatchWith(object, subset, (val, expected) => {
            if (expected === '**')
                return true;

            if (regexRegex.test(expected)) {
                let regex = new RegExp(regexRegex.exec(expected)[1]);
                return regex.test(val);
            }

            if (this.isDate(val))
                return moment(val).isSame(moment(expected));

            if (expected === null && matchNulls)
                return val == null;
        });
    },

    /**
     * Supports path notations in keys (see lodash _.get)
     * Check for null with expected of "-"
     * Evaluate expression by surrounding it with double-curly braces, e.g., {{this.order._id}}
     * Verify against regex by passing in (escaped) regex syntax, e.g., /^\\d+$/
     */
    verifyObjectIncludes(source, expected, context, message) {
        _.each(expected, (expectedValue, key) => {
            this.assertValueMatches(source, key, expectedValue, context, message);
        });

        return source;
    },

    /**
     *
     * @param source
     * @param expectedSubSet
     * @param context
     * @param [options] {Object|String} - options object or error message to append when verification fails.
     * @param [options.matchNulls] {Boolean} - true to verify that nulls in the expected set match nulls in the actual
     * @param [options.formatSubset] {Boolean}
     * @param [options.strictOrder] {Boolean} - if true, and the expectedSubSet is an array,
     *           the expectedSubSet must be in the same order as the source. default: false
     * @param [options.saveLinks] {Boolean} - true to save and return elements with "link" fields, and delete the "link" field
     * before verifying.
     */
    verifySetIncludes(source, expectedSubSet, context, options = {
        formatSubset: true,
        strictOrder: false,
        saveLinks: false
    }) {
        should.exist(source, `No data found!`);
        _.isArray(source).should.equal(true, `Expected array but found ${typeof source}!`);

        if (typeof options === 'string')
            options = { message: options };

        const verifyExists = (expected, index = -1) => {
            let link = expected.link || expected.LINK;
            if (options.saveLinks) {
                delete expected.link;
                delete expected.LINK;
            }

            let actual = source.find(x => this.objectsMatch(x, expected, options.formatSubset, context, options));
            let suffix = '';

            if (!actual)
                suffix = compare.getClosestMatchExplanation(source, expected, context);

            should.exist(actual, `${options.message ? options.message + ' -- ' : ''}No entry matched: ` +
                                 `${JSON.stringify(expected)}.` + suffix);
            if (options.strictOrder && (index > -1)) {
                let actualIndex = source.findIndex(x => this.objectsMatch(x, expected, options.formatSubset, context, options));
                index.should.equal(actualIndex, `${options.message ? options.message + ' -- ' : ''}` +
                                                `Entry is not in the expected position in the array. Expected: ${index}, actual ${actualIndex}: ${JSON.stringify(expected)}`)
            }

            if (options.saveLinks) {
                if (link) {
                    (context.savedLinks || (context.savedLinks = {}))[link] = actual;
                    return { [link]: actual };
                }
            } else
                return actual;
        };

        if (_.isArray(expectedSubSet))
            return expectedSubSet.map(verifyExists);
        else
            return verifyExists(expectedSubSet);
    },

    verifySetDoesNotInclude(source, expectedSubSet) {
        if (_.isArray(expectedSubSet))
            expectedSubSet.forEach(expected => verifyNotExists(source, expected));
        else
            verifyNotExists(source, expectedSubSet);
    },

    /**
     * Verifies that @source includes @expectedSubSet by using @matcher to match entries in @expectedSubSet
     * with elements in @source and, if a match is found, verifying that the matched entry (in @source) includes
     * the expected entry (in @expectedSubSet) by using the {@link this.verifyObjectIncludes} function.
     * @param source {Array} - the array of elements to test
     * @param expectedSubSet {Array} - the array of elements against which to verify
     * @param matchFactory {Function} - a function that returns a lodash matcher to match elements in @source.
     * Invoked with one argument: the current entry from @expectedSubSet that should be matched against.
     * @param context
     * @param message
     */
    verifySetIncludesBy(source, expectedSubSet, matchFactory, context, message) {
        should.exist(source, `No data found!`);
        _.isArray(source).should.equal(true, `Expected array but found ${typeof source}!`);

        return [].concat(expectedSubSet).map(expected => {
            if (typeof matchFactory === 'string')
                matchFactory = generateMatcher(matchFactory);

            let matcher = matchFactory(expected);
            let actual = _.find(source, matcher);
            let suffix = '';

            if (!actual)
                suffix = compare.getClosestMatchExplanation(source, expected, context);

            should.exist(actual, `no entry found matching ${chalk.bold(JSON.stringify(matcher))}.` + suffix);

            let entryMessage = `for entry: ${JSON.stringify(matcher)}` + (message ? ' -- ' + message : '');
            this.verifyObjectIncludes(actual, expected, context, entryMessage);
            return actual;
        })
    },

    /**
     * Same as @verifySetIncludes except also verifies and handles table formatting
     * @param source
     * @param table
     * @param context
     * @param [expectedCollectionName] {String}
     * @param [validateCount] {Boolean}
     * @param [formatOptions] {Object}
     * @param [verifyOptions] {Object}
     */
    verifySetMatchesTable(source, table, context, {
        expectedCollectionName,
        validateCount,
        formatOptions,
        verifyOptions
    } = {}) {
        should.exist(source, expectedCollectionName);
        let expected = this.formatAndCamelCase(table.hashes(), context, formatOptions);
        if (validateCount)
            source.length.should.equal(expected.length, `expected ${expected.length} records but found ${source.length}`);

        return this.verifySetIncludes(source, expected, context, verifyOptions);
    },

    /**
     * Same as {@link verifyObjectIncludes} except also verifies and handles table formatting
     * @param source
     * @param table
     * @param context
     * @param expectedCollectionName
     */
    verifyObjectIncludesTable(source, table, context, { expectedCollectionName, message, formatOptions } = {}) {
        should.exist(source, expectedCollectionName);
        let expected = this.formatAndCamelCase(table.rowsHash(), context, formatOptions);
        return this.verifyObjectIncludes(source, expected, context, message);
    },

    /**
     * Same as @verifySetDoesNotInclude except also verifies and handles table formatting
     * @param source
     * @param table
     * @param context
     * @param expectedCollectionName
     */
    verifySetDoesNotIncludeTable(source, table, context, { expectedCollectionName } = {}) {
        should.exist(source, expectedCollectionName);
        let expected = this.formatAndCamelCase(table.hashes(), context);
        return this.verifySetDoesNotInclude(source, expected, context);
    },

    /**
     * Supports path notations in keys (see lodash _.get)
     * Check for null with expected of "-"
     * Evaluate expression by surrounding it with double-curly braces, e.g., {{this.order._id}}
     * Verify against regex by passing in (escaped) regex syntax, e.g., /^\\d+$/
     * Checks for true/false if expected is "true" or "false"
     */
    assertValueMatches(source, key, expected, context, message) {
        if (expected === '**')
            return;

        let actualValue = _.get(source, key);

        let explanation = `field "${chalk.bold(key)}". Expected ${chalk.bold(JSON.stringify(expected))} but found: ` +
                          `${chalk.bold(JSON.stringify(actualValue))}` + (message ? ` -- ${message}` : '');

        if (_.isObject(expected) && !_.isDate(expected))
            return this.verifyObjectIncludes(actualValue, expected, context, message);

        if ((expected === '-') || (expected === null))
            should.not.exist(actualValue, explanation);

        else if (_.isDate(expected))
            this.validateTimesEqual(context, expected, actualValue, null, { key: key, explanation: explanation });

        else {
            if ((actualValue === undefined) && (actualValue === expected))
                return;

            should.exist(actualValue, explanation);

            if (regexRegex.test(expected)) {
                let regex = new RegExp(regexRegex.exec(expected)[1]);
                return regex.test(actualValue).should.equal(true, explanation);
            }

            if (Number.isFinite(actualValue))
                expected = parseFloat(expected);

            else
                expected = this._formatValue(expected, key, {}, {
                    context: context,
                    minusAsNull: true,
                    parseBooleans: true
                });

            actualValue.should.equal(expected, explanation);
        }
    },

    /**
     * @Deprecated -- use "format" method
     * @param expected
     * @param context
     * @returns {{}}
     */
    formatExpectedObject(expected, context) {
        let mapped = this.format(expected, context, { minusAsNull: true, parseAll: false });
        return _.omitBy(mapped, x => x == null);
    },

    evalWithContext(js, context) {
        return function () {
            return eval(js);
        }.call(context);
    },

    replaceEntityValue(text, context) {
        if (!valueAndEntityResolverRegex.test(text))
            return text;

        let resolved = this.resolveEntityValue(null, text, context);
        return text.replace(valueAndEntityResolverRegex, resolved);
    },

    resolveEntityValue(key, expected, context, dataObject) {
        let match = resolveEntityRegex.exec(expected);
        let entityName = match[1] || match[2];
        let path = match[3];

        if (valueResolverRegex.test(expected))
            key = valueResolverRegex.exec(expected)[1];

        let strategy = this.entityResolver.getValueResolver(key);
        if (!strategy && key.indexOf('.') > 0) {
            let path = key.split('.');
            strategy = this.entityResolver.getValueResolver(path[path.length - 1])
        }
        should.exist(strategy, `Could not find value-resolver for key "${key}"`);

        let entity = strategy(entityName, context, dataObject);
        should.exist(entity, `${key} value-resolver: Could not resolve entity "${entityName}"`);
        (_.has(entity, path)).should.equal(true, `"${entityName}": Path "${path}" not found in entity ${JSON.stringify(entity, null, 2)}`);

        let value = _.get(entity, path);

        if (_.isObjectId(value))
            value = value.toString();

        return value;
    },

    /*
     This special parsing method is intended to support "JSON" like properties
     in the cucumber data table.
     It will try to JSON.parse any property of the  supplied data that start with { or [,
     and continue with a log if fail.
     */
    parseJsonProperties(data) {
        let keys = _.keys(data);
        keys.forEach(k => {
            let v = data[k];
            if (v && (typeof v === 'string')) {
                if (v[0] === '{' || v[0] === '[') {
                    try {
                        data[k] = JSON.parse(v);
                    } catch (err) {
                        console.log(':::parseJsonProperties', err)
                    }
                }
            }
        });
        return data;
    },

    dropInternalIds(data) {
        let keys = _.keys(data);
        keys.forEach(k => {
            let v = data[k];
            if (typeof v === 'object') {
                if (v._id) {
                    delete v._id;
                }
                data[k] = self.dropInternalIds(v);
            }
        });
        return data;
    },

    mergeHeadless(rows) {
        if (!_.isArray(rows))
            throw new Error('utils.format: "mergeHeadless" option only supports arrays');

        let header = _.keys(rows[0])[0];
        let result = [];
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];
            if (!!row[header] || row[header] === 0)
                result.push(row);
            else if (i > 0)
                mergeRow(_.last(result), row);
            else
                throw new Error(`utils.format::mergeHeadless: found orphaned headless row: ${JSON.stringify(row)}`)
        }

        return result;
    },

    format(object, context, options) {
        options = options || { parseAll: true };
        options.context = options.context || context; // for backwards compatibility

        let result = _.isArray(object)
            ? object.map(x => this._format(x, options))
            : this._format(object, options);

        if (options.mergeHeadless)
            result = this.mergeHeadless(result);

        return result;
    },

    /**
     *
     * @param object
     * @param context
     * @param [options]
     * @param [options.context] -- the test context (world)
     * @param [options.parseAll]
     * @param [options.parseNumbers]
     * @param [options.parseDates]
     * @param [options.parseBooleans]
     * @param [options.parseJson]
     * @param [options.minusAsNull]
     * @param [options.parseCurrency]
     * @param [options.parseIntegerDates]
     * @param [options.numbersToCents]
     * @param [options.currencyToCents]
     * @param [options.plusAsExists]
     * @param [options.excludeMinuses]
     * @param [options.excludeFalsey]
     * @param [options.mergeHeadless]
     * @returns {*}
     */
    formatAndCamelCase(object, context, options) {
        if (!context)
            throw new Error('formatAndCamelCase() needs a context');

        options = options || { parseAll: true };
        return this.format(object, context, _.merge({ camelCase: true }, options));
    },

    /**
     * @deprecated - Use formatAndCamelCase instead
     * @param object
     * @param options - TODO
     * @returns {*}
     */
    keysToCamelCase(object, options) {
        options = options || {};
        options.camelCase = true;
        options.parseAll = options.parseAll || false;

        return this.format(object, null, options);
    },

    defer(result) {
        var deferred = Promise.pending();
        deferred.resolve(result);

        return deferred.promise;
    },

    executeAt(context, date, func) {
        let clock = context.sandbox.useFakeTimers(date.getTime());
        return func().finally(() => clock.restore());
    },

    fakeTimePassed(context, milliseconds) {
        if (!context.fakeClock)
            context.fakeClock = context.sandbox.useFakeTimers(Date.now(), 'Date');

        context.fakeClock.tick(milliseconds);
    },

    fakeDateTime(context, date, setToDate = true) {
        if (context.fakeClock)
            context.fakeClock.restore();

        context.fakeClock = setToDate ?
            context.sandbox.useFakeTimers(date, 'Date') :
            context.sandbox.useFakeTimers(date);

        context.addCleanupAction(() => {
            if (context.fakeClock)
                context.fakeClock.restore();
        })
    },

    parseAndFakeTime(context, time, isUtc) {
        let date = parse.parseTime(context, time, isUtc);
        this.fakeDateTime(context, date.getTime());
    },

    restoreRealTime(context) {
        if (!context.fakeClock)
            return;

        console.log(chalk.cyan(`Restoring time to present`));
        context.fakeClock.restore();
    },

    isDate(iMightBe) {
        if (iMightBe instanceof Date)
            return true;

        return moment(iMightBe, moment.ISO_8601, true).isValid();
    },

    diff(first, second) {
        return _.reduce(first, (result, value, key) => {
            return _.isEqual(value, second[key]) ? result : result.concat(key);
        }, []);
    },

    /**
     *
     * @param context {World} -- the test context
     * @param target {Object} -- the object whose method should be stubbed
     * @param targetName {String} -- the target name for logging purposes
     * @param methodName {String} -- the method to stub
     * @param response {Function|*} -- the response the stub should return or
     * a function who result the stub should return.
     * @returns {*}
     */
    stubMethod(context, target, targetName, methodName, response) {
        return Stubber.stubMethod(context, target, targetName, methodName, response);
    },

    _format(object, options) {
        options = options || {};

        // format organization first because it can affect the contextual data for all the following values
        // e.g., when using entity-value-resolvers
        if (object.organization)
            object.organization = this._formatValue(object.organization, 'organization', object, options);

        _.forOwn(object, (val, key, obj) => {
            delete obj[key];

            key = this.formatMappedObjectKey(key, options);
            val = this._formatValue(val, key, obj, options);

            if (val !== undefined)
                _.set(obj, key, val);
        });

        return object;
    },

    formatMappedObjectKey(key, options) {
        if (options.keyFormatter) {
            let formatted = options.keyFormatter(key);
            if (formatted)
                return formatted;
        }

        if (options.camelCase || options.keyPartFormatter) {
            options.hasKeyFormatter = !!options.keyPartFormatter;
            return pathSeparatorsRegex.test(key)
                ? key.split('.').map(part => keyToNewKey(part, options)).join('.')
                : keyToNewKey(key, options);
        }

        return key;
    },

    tryParseFloat(value, multiplier = 1) {
        return _.isFinite(parseFloat(value)) ? parseFloat(value) * multiplier : value;
    },

    parseNumberOrCurrency(val) {
        if (currencyRegex.test(val))
            return this.tryParseFloat(val.replace('$', ''), 100);

        return this.tryParseFloat(val);
    },

    /**
     *
     * @param val -- the value to format
     * @param [key]
     * @param [obj]
     * @param [options]
     * @param [options.context] -- the test context (world):
     * Enables expression-resolution and entity-resolution if @key and @obj are also provided.
     * @param [options.parseAll]
     * @param [options.parseNumbers]
     * @param [options.parseDates]
     * @param [options.parseBooleans]
     * @param [options.parseJson]
     * @param [options.minusAsNull]
     * @param [options.parseCurrency]
     * @param [options.parseIntegerDates]
     * @param [options.numbersToCents]
     * @param [options.currencyToCents]
     * @param [options.plusAsExists]
     * @param [options.excludeMinuses]
     * @param [options.excludeFalsey]
     * @param [options.excludeEmpty]
     * @param {function}[options.formatCustom] - custom format function for values.
     *        if any value is returned, it will be used as the formated value
     *        func(value, key, object, options) where:
     *            value - the string value before parsing
     *            key - the property the value was set to.
     *            object - the obejct that holds the property.
     *            options - the format call options
     * @returns {*} -- the formatted value
     */
    _formatValue(val, key, obj, options) {
        if (options.formatCustom) {
            let customValue = options.formatCustom(val, key, obj, options);
            if (!_.isUndefined(customValue))
                return customValue;
        }

        if (_.isArray(val))
            return val.map(v => this._formatValue(v, key, obj, options));

        if (isOptionActive(options.parseCurrency, options.parseAll) && currencyRegex.test(val)) {
            let multiplier = (options.currencyToCents !== false) ? 100 : 1;
            return this.tryParseFloat(val.replace('$', ''), multiplier);
        }

        if (options.parseIntegerDates && moment(val, 'YYYYMMDD', true).isValid())
            return this.formatDate(val);

        if (isOptionActive(options.parseNumbers, options.parseAll)) {
            let augment = options.numbersToCents ? x => _.round(x * 100) : x => x;
            if (_.isArray(options.parseNumbers)) {
                if (options.parseNumbers.some(x => x === key))
                    return augment(this.tryParseFloat(val));
            } else if (floatRegex.test(val))
                return augment(this.tryParseFloat(val));
        }

        if (isOptionActive(options.parseDates, options.parseAll) && (self.isDate(val) || localDateRegex.test(val)))
            return this.formatDate(val);

        if (isOptionActive(options.parseBooleans, options.parseAll) && ['true', 'false'].some(b => b === val))
            return (val === 'true');

        if (options.context && resolveExpressionRegex.test(val))
            return this.evalWithContext(resolveExpressionRegex.exec(val)[1], options.context);

        if (isOptionActive(options.parseJson, options.parseAll) && val && (typeof val === 'string') &&
            ((val.trim().startsWith('{') && val.trim().endsWith('}')) ||
             (val.trim().startsWith('[') && val.trim().endsWith(']')))) {
            val = JSON5.parse(val);
            return _.isArray(val) ? val.map(v => this._formatValue(v, key, obj, options)) : val;
        }

        if (key && obj && options.context && resolveEntityRegex.test(val))
            return this.resolveEntityValue(key, val, options.context, obj);

        if (options.excludeMinuses && val === '-')
            return undefined;

        if (isOptionActive(options.plusAsExists, options.parseAll) && val === '+')
            return {};

        if (isOptionActive(options.minusAsNull, options.parseAll) && val === '-')
            return null;

        if (options.parseAll && inQuotesRegex.test(val))
            return inQuotesRegex.exec(val)[1];

        if (options.excludeMinuses && val === '-')
            return undefined;

        if (options.excludeFalsey && !val)
            return undefined;

        if (options.excludeEmpty && val === '')
            return undefined;

        return val;
    },

    formatDate(val) {
        let parsed = localDateRegex.exec(val);
        if (parsed)
            return moment.tz(parsed[2], parsed[1]).toDate();

        return moment.utc(val).toDate();
    },

    /**
     * Converts any path-style key-values into real nested key-values.
     * E.g., {"some.key": 99} will be converted to {some: {key: 99}}
     * @param object
     * @param [options] -- readValue options
     * @param [options.parseJson] -- parse JSON
     * @param [options.minusAsNull] -- convert minus ("-") to null
     * @returns {*}
     */
    buildPaths(object, options) {
        options = options || {};
        return _.transform(object, (res, val, key) => {
            val = this._formatValue(val, null, null, options);

            if (key.indexOf('.') > -1)
                _.set(res, key, val);
            else
                res[key] = val;
        });
    },

    mapAmountPropertiesToCentAmount(obj) {
        return _.mapValues(obj, (value) => {
            if (/^\-?\d+\.\d{2}$/.test(value))
                return _.round(parseFloat(value) * 100);
            return value;
        })
    },

    /**
     *
     * @param val -- the value to format
     * @param [options]
     * @param [options.parseNumbers]
     * @param [options.parseDates]
     * @param [options.parseBooleans]
     * @param [options.context] -- the test context (world):
     * Enables expression-resolution and entity-resolution if @key and @obj are also provided.
     * @param [options.parseJson]
     * @param [options.minusAsNull]
     * @returns {*} -- the formatted value
     * @private
     */
    formatValue(val, options) {
        return this._formatValue(val, null, null, options);
    },

    streamToString(stream, done) {
        const chunks = [];
        stream.on('data', (chunk) => {
            chunks.push(chunk.toString());
        });
        stream.on('end', () => {
            done(null, chunks.join(''));
        });
    },

    /**
     * Used by dynamic resolvers, e.g., in features/business_day/move_business_day.feature
     * Do not modify/delete without validating consumers!
     */
    utcToLocalTimeInt(context, utcTime) {
        let timezone = context.org.timezone || 'Asia/Jerusalem';
        let localDate = _.time.getLocalTime(utcTime, timezone);
        return parseInt(localDate.format('HHmm'));
    },

    validateTimesEqual(context, expectedUtc, actualTime, isActualUtc, { key, explanation } = {}) {
        let areEqual = compare.areTimesEqual(context, expectedUtc, actualTime, isActualUtc, {
            key: key,
            explanation: explanation
        });

        if (areEqual !== true)
            assert.fail(areEqual);
    },

    /**
     * Extract cucumbers' rowsHash(), but turn duplicates to array
     * @param table {cucumber.Table} The table passed by cucumber to the step implementation
     */
    rowsHash(table) {
        let lines = table.raw();
        let result = {};
        lines.forEach(o => {
            let key = o[0];
            let value = o[1];
            if (result[key]) {
                let existing = result[key];
                if (!_.isArray(existing)) existing = [existing];
                existing.push(value);
                result[key] = existing;
            } else
                result[key] = value;
        });
        return result;
    },

    /**
     * Extract cucumbers' hashes(), but turn duplicates to array
     * @param table {cucumber.Table} The table passed by cucumber to the step implementation
     */
    hashes(table) {
        let lines = table.raw();
        let resultList = [];
        if (lines.length === 0) return resultList;
        let keys = lines[0];
        for (let i = 1; i < lines.length; i++) {
            let line = lines[i];
            let result = {};
            for (let j = 0; j < line.length; j++) {
                let key = keys[j];
                let value = line[j];
                if (result[key]) {
                    let existing = result[key];
                    if (!_.isArray(existing)) existing = [existing];
                    existing.push(value);
                    result[key] = existing;
                } else
                    result[key] = value;
            }
            resultList.push(result);
        }
        return resultList;
    },

    parseBoolean(s) {
        if (_.isTrue(s)) return true;
        if (_.isFalse(s)) return false;
    },

    isStubMethod(method) {
        return method.isSinonProxy
    },

    xmlToJson(xml) {
        return Promise.promisify(xmlParser.parseString)(xml);
    }
};

const inQuotesRegex = /^"(.*)"$/;
const haveSquareBracketsRegex = /\[(.*)]$/;

function keyToNewKey(key, { keyPartFormatter = x => _.camelCase(x), ...options } = {}) {
    let suffix = '';
    if (haveSquareBracketsRegex.test(key)) {
        suffix = haveSquareBracketsRegex.exec(key)[0];
        key = key.split('[')[0];
    }

    if (inQuotesRegex.test(key))
        return inQuotesRegex.exec(key)[1];

    let haveUnderScore = _.startsWith(key, '_');
    let newKey = keyPartFormatter(key) + suffix;
    if (haveUnderScore && !options.hasKeyFormatter)
        newKey = '_' + newKey;
    if (options && options.capitalize)
        newKey = _.capitalize(newKey);
    return newKey;
}

function generateMatcher(prop) {
    return expected => {
        return { [prop]: expected[prop] }
    };
}

function isOptionActive(specificVal, defaultVal) {
    if (specificVal === false)
        return false;

    return defaultVal || specificVal;
}

function verifyNotExists(source, expected) {
    let found = source.some(x => self.objectsMatch(x, expected));
    found.should.equal(false, `expected "${JSON.stringify(expected)}" to not exist.`)
}

function mergeRow(target, row) {
    _.forOwn(row, (val, key) => {
        if (val === '')
            return;

        if (_.isObject(val))
            return mergeRow(target[key], val);

        if (!target[key])
            target[key] = val;

        target[key] = [].concat(target[key], val);
    })
}

self.verifyEqualAsync = Promise.promisify(self.verifyEqual);
self.entityResolver.register(['link'], (name, context) =>
    context.savedLinks && context.savedLinks[name]);

module.exports = utility.use(self);
