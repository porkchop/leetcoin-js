var debug = require('debug')('leetcoin');
var request = require('request');
var crypto = require('crypto');
var FormUrlencoded = require('form-urlencoded');

function Server(params) {
  this.title = params.title;
  this.hostAddress = params.hostAddress;
  this.hostPort = params.hostPort;
  this.hostConnectionLink = params.hostConnectionLink;
  this.gameKey = params.gameKey;
  this.maxActivePlayers = params.maxActivePlayers;
  this.maxAuthorizedPlayers = params.maxAuthorizedPlayers;
  this.minimumBTCHold = params.minimumBTCHold;
  this.incrementBTC = params.incrementBTC;
  this.serverRakeBTCPercentage = params.serverRakeBTCPercentage;
  this.serverAdminUserKey = params.serverAdminUserKey;
  this.leetcoinRakePercentage = params.leetcoinRakePercentage;
  this.allowNonAuthorizedPlayers = params.allowNonAuthorizedPlayers;
  this.stakesClass = params.stakesClass;
  this.motdShowBanner = params.motdShowBanner;
  this.motdBannerColor = params.motdBannerColor;
  this.motdBannerText = params.motdBannerText;
}

Server.prototype.toMedium = function() {
  return {
    hostConnectionLink: this.hostConnectionLink,
    gameKey: this.gameKey,
    title: this.title,
    minimumBTCHold: this.minimumBTCHold,
    incrementBTC: this.incrementBTC
  };
}

// a leetcoin player
function Player(params) {
  this.platformID = this.key = params.key;
  this.kills = params.kills;
  this.deaths = params.deaths;
  this.name = params.name;
  this.rank = params.rank;
  this.weapon = params.weapon;
}



function API(developer_shared_secret, developer_api_key, url, game_key, proto) {
  this.developer_shared_secret = developer_shared_secret;
  this.developer_api_key = developer_api_key;
  this.url = url;
  this.proto = proto || 'https://';
  this.game_key = game_key;
}

API.version = require('../package').version;

// Public
API.prototype.serverCreate = function(params, cb) {
  var uri = '/api/server_create'
  
  params.gameKey = this.game_key;
  var server = new Server(params);
  
  var serverJSON = JSON.stringify(server.toMedium());
  //var serverJSON = JSON.stringify(server);
  
  
  var params = {server: serverJSON};
  
  this._callLeetcoin(uri, params, this.developer_shared_secret, this.developer_api_key, function(error, response, body) {
    if(error) return cb(error);
    
    if(response.statusCode !== 200) return cb(body);

    var bodyObj = JSON.parse(body);
    debug(bodyObj.apiKey);
    if(!bodyObj.server) return cb(body);
    
    cb(null, bodyObj.server);
  });
};

// Public
API.prototype.activatePlayer = function(platformid, server_secret, server_api_key, cb) {
  // send the player to the api server

  debug(platformid)
  debug('server_secret:' + server_secret)
  debug('server_api_key:' + server_api_key)

  var uri = "/api/activate_player"

  var params = {
    platformid: platformid
  };

  this._callLeetcoin(uri, params, server_secret, server_api_key, function(error, response, body) {
    if(error) return cb(error);
    
    debug(body);
    if(response.statusCode !== 200) return cb(body);

    var bodyObj = JSON.parse(body);
    
    cb(null, bodyObj);
  });
};

// Public
API.prototype.deactivatePlayer = function(game, platformid, cb) {
  // send the player to the api server

  cb = cb || function(err) { if(err) console.error(err); };

  debug(platformid)
  debug('server_secret:' + game.server_secret)
  debug('server_api_key:' + game.server_api_key)

  var uri = "/api/deactivate_player"

  var params = {
    platformid: platformid
  };

  this._callLeetcoin(uri, params, game.server_secret, game.server_api_key, function(error, response, body) {
    if(error) return cb(error);
    
    debug(body);
    if(response.statusCode !== 200) return cb(body);

    var bodyObj = JSON.parse(body);
    
    cb(null, bodyObj);
  });
},

// Public
API.prototype.setMatchResults = function(game, map_title, player_keys, player_names, weapons, kills, deaths, ranks, cb) {
  debug(player_keys)
  debug(player_names)
  debug(weapons)
  debug(kills)
  debug(deaths)
  debug(ranks)
  debug(map_title)

  var playerlist = player_keys.map(function(playerkey, index) {
    return new Player({
      key: playerkey,
      kills: kills[index],
      deaths: deaths[index],
      name: player_names[index],
      weapon: weapons[index],
      rank: ranks[index],
    });
  });
      
  var player_json_list = JSON.stringify(playerlist);

  var uri = "/api/put_match_results"

  var params = {
    map_title: map_title,
    player_dict_list: player_json_list
  };

  this._callLeetcoin(uri, params, game.server_secret, game.server_api_key, function(error, response, body) {
    if(error) return cb(error);

    debug(body);
    if(response.statusCode !== 200) return cb(body);

    var bodyObj = JSON.parse(body);
    
    cb(null, bodyObj);
  });
}

// Public
API.prototype.setMatchMakerResults = function(game, map_title, player_keys, player_names, weapons, kills, deaths, ranks, cb) {
  debug(player_keys)
  debug(player_names)
  debug(weapons)
  debug(kills)
  debug(deaths)
  debug(ranks)
  debug(map_title)

  var playerlist = player_keys.map(function(playerkey, index) {
    return new Player({
      key: playerkey,
      kills: kills[index],
      deaths: deaths[index],
      name: player_names[index],
      weapon: weapons[index],
      rank: ranks[index],
    });
  });
      
  var player_json_list = JSON.stringify(playerlist);

  var uri = "/api/put_matchmaker_results"

  var params = {
    match_key: game.match_key,
    map_title: map_title,
    player_dict_list: player_json_list
  };

  this._callLeetcoin(uri, params, this.developer_shared_secret, game.match_key, function(error, response, body) {
    if(error) return cb(error);
    debug(body);
    if(response.statusCode !== 200) return cb(body);

    var bodyObj = JSON.parse(body);
    
    cb(null, bodyObj);
  });
}

// Private
API.prototype._callLeetcoin = function(uri, params, secret, key, cb) {  
  var nonce = Date.now();
  
  params.nonce = nonce;
  
  params = FormUrlencoded.encode(params);

  // Hash the params string to produce the Sign header value
  var sign = crypto
    .createHmac('sha512', secret)
    .update(params)
    .digest('hex');
  
  debug('Sign:', sign);
  debug('nonce:', nonce);
  debug('key:', key);

  var headers = {
    'Content-type': 'application/x-www-form-urlencoded',
    'Key': key,
    'Sign': sign
  };

  request({
    method: 'POST',
    url: this.proto + this.url + uri,
    body: params,
    headers: headers
  }, cb);
}


module.exports = API;