
/**
 * Module dependencies.
 */

var Leetcoin = require('../')
  , should = require('should');

Leetcoin.version.should.match(/^\d+\.\d+\.\d+$/);

describe('leetcoin', function() {
  var developer_shared_secret = 'developer_shared_secret'
    , developer_api_key = 'developer_api_key'
    , url = 'http://test.gameserver.com'
    , game_key = 'game_key';

  describe('#constructor', function() {
    it('should create an API instance', function() {
      var leetcoin = new Leetcoin(developer_shared_secret, developer_api_key, url, game_key);

      leetcoin.should.be.ok;
    });
  });
});