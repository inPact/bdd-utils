const _ = require('@tabit/utils').moredash;
const { reflect } = require('@tabit/utils');
const moment = require('moment-timezone');
const chalk = require('chalk');
const debug = require('debug')('bdd');
const parse = require('./parse');
const regexRegex = /^\/(.*)\/$/;

module.exports = {
    /**
     * Same as lodash#isMatch, with some additional options (and reversed arguments!)
     * @param subsetObject
     * @param fullObject
     * @param [ignoreNulls] {Boolean} - true to ignore properties in subsetObject whose value
     * is null or undefined. Defaults to false.
     * @returns {boolean}
     */
    isSubsetOf(subsetObject, fullObject, { ignoreNulls } = {}) {
        /*
        A note about this implementation: There seems to be a bug in lodash that customizers are ignored
        when the property being compared is undefined in the @other object (here called the @subsetObject).
        Therefore we are forced to remove any null/undefined values from the object we are comparing to.
         */
        if (ignoreNulls)
            subsetObject = _.mapDeep(subsetObject, (val, key, obj) => {
                if (val == null)
                    delete obj[key];
            });

        return _.isMatch(fullObject, subsetObject);
    },

    objectIncludes: function (source, expected, context, message) {
        _.map(expected, (expectedValue, key) => {
            return this.valueMatches(source, key, expectedValue, context, message);
        });
    },

    tryFindClosestMatch(source, expected, context) {
        let matches = source.map(x => this.getMatchScore(x, expected, context));
        let bestMatch = { score: 0 };
        let bestMatchIndex;
        matches.forEach((match, i) => {
            let score = match.score;
            if (score > bestMatch.score) {
                bestMatch = match;
                bestMatchIndex = i;
            }
        });

        if (bestMatchIndex >= 0)
            return {
                match: source[bestMatchIndex],
                score: bestMatch.score,
                diffs: bestMatch.diffs
            };

        debug(`no closest match found -- matches: ${JSON.stringify(matches, null, 2)}`);
    },

    getClosestMatchExplanation(source, expected, context) {
        let closest = this.tryFindClosestMatch(source, expected, context);
        if (closest)
            return `\n${chalk.yellow('Diff to closest match')}: ${closest.diffs && closest.diffs.join('\n\t')}` +
                   `\n${chalk.yellow('Closest match')} (${chalk.bold('score=' + closest.score)}): ` +
                   `${JSON.stringify(closest.match, null, 2)}`;

        return '';
    },

    /**
     * Returns the match score (number of properties that matched) and the diffs (explanation for each property
     * that didn't match) between @other and all elements in @source
     * @param source - Array of elements to compare to
     * @param other - an object to score against the elements in source
     * @param context
     * @returns {{score: Number, diffs: Array.<String>}}
     */
    getMatchScore(source, other, context) {
        let matches = _.map(other, (otherVal, key) => this.valueMatches(source, key, otherVal, context));
        let score = _.sumSafe(matches);
        let diffs = matches.filter(x => !_.isBoolean(x) && !_.isNumber(x));

        return { score: score, diffs: diffs };
    },

    /**
     * Supports path notations in keys (see lodash _.get)
     * Check for null with expected of "-"
     * Evaluate expression by surrounding it with double-curly braces, e.g., {{this.order._id}}
     * Verify against regex by passing in (escaped) regex syntax, e.g., /^\\d+$/
     * Checks for true/false if expected is "true" or "false"
     */
    valueMatches: function (source, key, expected, context, message) {
        if (expected === '**')
            return true;

        let actualValue = _.get(source, key);
        let explanation = () => `field "${chalk.bold(key)}". Expected ${chalk.bold(JSON.stringify(expected))} but found: ` +
                                `${chalk.bold(JSON.stringify(actualValue))} ${(message ? ` -- ${message}` : '')} ` +
                                `${chalk.dim(`(at ${reflect.getCallingFrame().toString()})`)}`;

        if (_.isObject(expected) && !_.isDate(expected)) {
            if (!_.isObject(actualValue))
                return explanation();

            let match = this.getMatchScore(actualValue, expected, context);
            return match.diffs.length ? match.diffs : match.score;
        }

        if ((expected === '-' || expected === null) && actualValue != null)
            return explanation();

        else if (_.isDate(expected))
            return this.areTimesEqual(context, expected, actualValue, null, {
                key: key,
                explanation: explanation()
            });

        else {
            if (actualValue == null)
                return expected == null ? true : explanation();

            if (regexRegex.test(expected)) {
                let regex = new RegExp(regexRegex.exec(expected)[1]);
                return regex.test(actualValue) ? true : explanation();
            }

            if (Number.isFinite(actualValue))
                expected = parseFloat(expected);

            if (actualValue !== expected)
                return explanation();

            return true;
        }
    },

    areTimesEqual: function (context, expectedUtc, actualTime, isActualUtc, { key, explanation } = {}) {
        if (!actualTime)
            return explanation || `expected time at property "${key}"!`;

        let expected = moment.utc(expectedUtc);

        if (!actualTime)
            return `expected date matching "${chalk.bold(expected)}" but found null`;

        let actual = parse.parseTime(context, actualTime, isActualUtc, { writeLogs: false });
        if (!expected.isSame(actual))
            return explanation;

        return true;
    },
};