const utils = require('../');
const should = require('chai').should();

describe('should include: ', function () {
    it('attached modules and functions', async function () {
        should.exist(utils.compare);
        should.exist(utils.parse);
        should.exist(utils.Stubber);
        should.exist(utils.format);
    });

    // it('all utility properties', async function () {
    //     should.exist(utils.moredash);
    //     should.exist(utils.getId);
    // });
});
