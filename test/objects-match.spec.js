const utils = require('../');
const should = require('chai').should();

describe('objectsMatch should: ', function () {
    it('match using regex', async () => {
        let goodData = { data: 'hello world' };
        let badData = { data: 'hello whirl' };
        let expected = { data: '/^h.+d$/' };

        utils.objectsMatch(goodData, expected).should.equal(true);
        utils.objectsMatch(badData, expected).should.equal(false);
    });

    it('match using regex with flags', async () => {
        let goodData = { data: 'HELLO world' };
        let expected = { data: '/^h.+d$/i' };

        utils.objectsMatch(goodData, expected).should.equal(true);
    });
});
