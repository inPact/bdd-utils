const compare = require('../src/compare');
const should = require('chai').should();

describe('compare.getMatchScore should: ', function () {
    it('recognize equality using regex with flags', async () => {
        let goodData = { data: 'HELLO world' };
        let expected = { data: '/^h.+d$/i' };

        let match = compare.getMatchScore(goodData, expected);
        match.score.should.equal(1);
    });
});
