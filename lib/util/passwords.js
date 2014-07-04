var scrypt = require('scrypt');
	scrypt.hash.config.keyEncoding = scrypt.verify.config.keyEncoding = 'utf8';
	scrypt.hash.config.outputEncoding = scrypt.verify.config.outputEncoding = 'base64';

process.argv.splice(2, process.argv.length-2).forEach(function(p){
	console.log(p + ' : ' + scrypt.hash(p, scrypt.params(0.1)));
});
