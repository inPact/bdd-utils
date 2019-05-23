const utils = require('../');
const should = require('chai').should();

describe('should include: ', function () {
    it('attached modules and functions', async function () {
        should.exist(utils.compare);
        should.exist(utils.parse);
        should.exist(utils.Stubber);
        should.exist(utils.format);
    });

    it('all utility properties', async function () {
        should.exist(utils.moredash);
        should.exist(utils.getId);
    });
});

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
    })
});

describe('formatExpectedObject should: ', function () {
    it('remove nulls', async () => {
        let expectedObject = { a: 'hi', b: null };
        let res = utils.formatExpectedObject(expectedObject, {});
        if (res.hasOwnProperty('b'))
            should.fail();
    })
});
