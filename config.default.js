'use strict';

var fs = require('fs');
var crypto = require('crypto');

module.exports = {
	// This is the root path for the portal, without trailing slash. It
	// might be used to host your system at www.example.com/portal.
	root: '',

	// These are the connection details for RethinkDB.
	db: {
		host: '127.0.0.1',
		db: 'gandhi'
	},

	// To make things run faster, we keep a pool of Rethinkdb connections
	// inside each process. You can tune the pool's settings here.
	pool: {
		max: 30,
		min: 1,
		timeout: 30000
	},

	// These are the connection details for Redis.
	redis: {
		host: '127.0.0.1',
		port: 6379
	},

	// When gandhi can't use an atomic operation to alter a document in
	// rethinkdb, we need to lock it so we don't try to process multiple
	// writes at the same time. You can tune the lock settings here.
	lock: {
		retry: 100,
		timeout: 30000
	},

	// Authentication is made persistant by ust of Json Web Tokens. You
	// must provide a secret for cryptographically signing these tokens.
	// Make sure this stays secret, or an attacker could impersonate
	// system users.
	auth: {
		secret: ''
	},

	// Gandhi used nodemailer to support almost any mail sending option
	// out there. You can configure it here. Learn more at:
	// https://github.com/andris9/Nodemailer
	mail: {
		transport: {
			service: 'Mandrill',
			auth: {
				user: 'mike.marcacci@gmail.com',
				pass: '0eCce8d2FKfLrTxiFYOReg'
			}
		},
		defaults: {
			from: 'test@test.gandhi.io'
		}
	},

	// Gandhi uses a module system to add new functionality. In fact,
	// many core components are actually written as modules. This must
	// be an array of paths to the various different modules you wish
	// to use.
	//
	// In this example, we programatically build a list of modules from
	// the modules directlry.
	modules: fs.readdirSync(__dirname + '/lib/modules').map(function(dir){
		return __dirname + '/lib/modules/' + dir;
	}),

	// Where do you want to store uploaded files? Right now, this only
	// supports using the local filesystem or NFS, but in the future
	// it will support other options like S3 and CloudFiles
	files: {
		directory: __dirname + '/uploads'
	},

	// On what port do you want gandhi to listen? In our opinion, it's
	// best to run apps behind something like NGINX, but there's nothing
	// stoppingy you from just running directly on port 80.
	port: 3000,

	
	sso: {
		path: '/sso',
		entryPoint: 'https://openidp.feide.no/simplesaml/saml2/idp/SSOService.php',
		issuer: 'http://gandhi.local:3000',
		cert: 'MIICizCCAfQCCQCY8tKaMc0BMjANBgkqhkiG9w0BAQUFADCBiTELMAkGA1UEBhMCTk8xEjAQBgNVBAgTCVRyb25kaGVpbTEQMA4GA1UEChMHVU5JTkVUVDEOMAwGA1UECxMFRmVpZGUxGTAXBgNVBAMTEG9wZW5pZHAuZmVpZGUubm8xKTAnBgkqhkiG9w0BCQEWGmFuZHJlYXMuc29sYmVyZ0B1bmluZXR0Lm5vMB4XDTA4MDUwODA5MjI0OFoXDTM1MDkyMzA5MjI0OFowgYkxCzAJBgNVBAYTAk5PMRIwEAYDVQQIEwlUcm9uZGhlaW0xEDAOBgNVBAoTB1VOSU5FVFQxDjAMBgNVBAsTBUZlaWRlMRkwFwYDVQQDExBvcGVuaWRwLmZlaWRlLm5vMSkwJwYJKoZIhvcNAQkBFhphbmRyZWFzLnNvbGJlcmdAdW5pbmV0dC5ubzCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkCgYEAt8jLoqI1VTlxAZ2axiDIThWcAOXdu8KkVUWaN/SooO9O0QQ7KRUjSGKN9JK65AFRDXQkWPAu4HlnO4noYlFSLnYyDxI66LCr71x4lgFJjqLeAvB/GqBqFfIZ3YK/NrhnUqFwZu63nLrZjcUZxNaPjOOSRSDaXpv1kb5k3jOiSGECAwEAATANBgkqhkiG9w0BAQUFAAOBgQBQYj4cAafWaYfjBU2zi1ElwStIaJ5nyp/s/8B8SAPK2T79McMyccP3wSW13LHkmM1jwKe3ACFXBvqGQN0IbcH49hu0FKhYFM/GPDJcIHFBsiyMBXChpye9vBaTNEBCtU3KjjyG0hRT2mAQ9h+bkPmOvlEo/aH0xR68Z9hw4PF13w=='
	}
};

// get or set the secret
var secret = __dirname + '/secret.txt';
if(fs.existsSync(secret)) {
	module.exports.auth.secret = fs.readFileSync(secret, {encoding: 'base64'});
} else {
	module.exports.auth.secret = crypto.randomBytes(256).toString('base64');
	fs.writeFileSync(secret, module.exports.auth.secret);
}
