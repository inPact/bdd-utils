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

describe('formatExpectedObject should: ', function () {
    it('remove nulls', async () => {
        let expectedObject = { a: 'hi', b: null };
        let res = utils.formatExpectedObject(expectedObject, {});
        if (res.hasOwnProperty('b'))
            should.fail();
    })
});
