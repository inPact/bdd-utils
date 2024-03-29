const utils = require('../');
const should = require('chai').should();
const moment = require('moment');

describe('format should: ', function () {
    it('resolve value using resolver', async () => {
        utils.entityResolver.register(['data', 'info'],
            (name, context, data) => (data.info && data.info[name]) || (context.data && context.data[name]));

        let objToFormat = {};
        objToFormat['content.0.info'] = '"blue"._id';
        objToFormat['content.0.data'] = '"black".department';
        objToFormat['content.0.extra'] = '[data]"red".software';
        objToFormat['content.1.info'] = '(blue).example';
        objToFormat['content.1.data'] = '(black).tvShow';
        objToFormat['content.1.extra'] = '[data](red)._id';
        let context = {
            data: {
                blue: { _id: 'B', example: 'sky' },
                red: { _id: 'R', software: 'hat' }
            }
        };

        objToFormat.info = {
            black: { _id: '000', department: 'ops', tvShow: 'mirror' }
        };

        let formatted = utils.format(objToFormat, context);
        let actual = formatted.content;

        actual.should.deep.equal([
            {
                info: 'B',
                data: 'ops',
                extra: 'hat'
            },
            {
                info: 'sky',
                data: 'mirror',
                extra: 'R'
            }
        ])
    });

    it('resolve multiple values using resolver', async () => {
        utils.entityResolver.register(['data', 'info'],
            (name, context, data) => (data.info && data.info[name]) || (context.data && context.data[name]));

        let objToFormat = { data: '["[data](blue)._id","[data](red)._id"]' };

        let context = {
            data: {
                blue: { _id: 'B', example: 'sky' },
                red: { _id: 'R', software: 'hat' }
            }
        };

        let formatted = utils.format(objToFormat, context);

        formatted.should.deep.equal({ data: ['B', 'R'] })
    });

    it('parse date to local time', async () => {
        let objToFormat = { theDate: '[local] 2017-01-01 10:00' };

        let formatted = utils.format(objToFormat, {});
        let actual = formatted.theDate;

        moment('2017-01-01 10:00').isSame(actual).should.equal(true);
    });

    it('resolve values in strings', async () => {
        utils.entityResolver.register(['colors'],
            (name, context) => (context.colors && context.colors[name]));

        let context = {
            colors: {
                B: { color: 'blue' },
            }
        };

        let expected = { data: '/^hello [colors](B).color world$/' };
        let formatted = utils.format(expected, context);

        formatted.data.should.equal('/^hello blue world$/');

        let actual = { data: 'hello blue world' };
        utils.objectsMatch(actual, formatted).should.equal(true);
    });
});
