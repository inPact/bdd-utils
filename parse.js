const _ = require('lodash');
const moment = require('moment-timezone');
const chalk = require('chalk');

module.exports = {
    parseTime: function (context, time, isUtc, { writeLogs = true } = {}) {
        if (isUtc || _.endsWith(time, 'Z')) {
            let date = time.length === 5
                ? moment.utc(time, 'HH:mm').toDate()
                : moment.utc(time).toDate();

            if (writeLogs)
                console.log(chalk.cyan(`${time} Setting time to ${date}`));

            return date;
        }

        let timezone = _.get(context, 'org.timezone', 'Asia/Jerusalem');
        let date = time.length === 5
            ? moment.tz(time, 'HH:mm', timezone).toDate()
            : moment.tz(time, timezone).toDate();

        if (writeLogs)
            console.log(chalk.cyan(`${time} in time-zone ${timezone} requested: Setting time to ${date}`));

        return date;
    },
};