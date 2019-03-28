const _ = require('lodash');
const debug = require('debug')('bdd');

exports.Stubber = class Stubber {
    constructor(target, { targetName } = {}) {
        this.target = target;
        this.targetName = targetName;
    }

    /**
     *
     * @param context {World} -- the test context
     * @param methodName {String} -- the method to stub
     * @param response {Function|*} -- the response the stub should return or
     * a function who result the stub should return.
     * @returns {*}
     */
    stubMethod(context, methodName, response) {
        return Stubber.stubMethod(context, this.target, this.targetName, methodName, response);
    }

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
    static stubMethod(context, target, targetName, methodName, response) {
        if (target[methodName].restore)
            target[methodName].restore();

        let func = function () {
            let message = arguments[arguments.length - 1];
            context[`last${_.capitalize(methodName)}Request`] = context[`last${targetName}Request`] = message;
            debug(`captured "${methodName}" request to "${targetName}": ${JSON.stringify(message)}`);
            return _.isFunction(response) ? response(...arguments) : Promise.resolve(response);
        };

        context.addCleanupAction(() => {
            if (target[methodName].restore)
                target[methodName].restore();
        });

        return context.sandbox.stub(target, methodName, func);
    }
};