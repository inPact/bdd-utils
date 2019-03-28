const utils = require('../');
const should = require('chai').should();

describe('should include: ', function () {
    it('attached modules and functions', async function () {
        should.exist(utils.compare);
        should.exist(utils.parse);
        should.exist(utils.Stubber);
        should.exist(utils.format);
    });
});
