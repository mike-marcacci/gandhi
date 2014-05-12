var crypto = require('crypto');

function generateHash(password, options){
  return crypto.pbkdf2Sync(password.toString(), options.salt, options.iterations, options.keylen);
};

// generate a pseudo-unique entry ID for journaling
function encrypt(password, options){

  // extend the default options
  options = options || {};
  options = {
    iterations: options.iterations || 10000,
    keylen: options.keylen || 64,
    algo: options.algo || 'sha1'
  };

  if(!options.salt) {
    options.salt = crypto.randomBytes(64);
  }

  return [generateHash(password || new Buffer(''), options).toString('base64'), options.salt.toString('base64'), options.iterations, options.algo].join(':')
};

function test(password, truth){
  if(!password || !truth)
    return false;

  var params = truth.split(':');
  var trueKey = new Buffer(params[0], 'base64');
  var options = {
    salt: new Buffer(params[1] || '', 'base64'),
    iterations: Number(params[2]),
    keylen: trueKey.length,
    algo: params[3]
  };

  return generateHash(password, options).toString('base64') == trueKey.toString('base64');
};

module.exports = {
  encrypt: encrypt,
  test: test
}
