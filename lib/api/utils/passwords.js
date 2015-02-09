var scrypt = require('scrypt');
	scrypt.hash.config.keyEncoding = scrypt.verify.config.keyEncoding = 'utf8';
	scrypt.hash.config.outputEncoding = scrypt.verify.config.outputEncoding = 'base64';


module.exports = {
	encrypt: function(plain) {
		return scrypt.hash(plain, scrypt.params(0.1))
	}
}