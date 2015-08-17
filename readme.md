-
-
**We are actively looking for contributors, and are willing to pay for quality pull requests! If you are at all interested, please [send Mike an email](mailto:mike.marcacci@gmail.com)!**

-
-

Gandhi
======

[![wercker status](https://app.wercker.com/status/7796fb32b691c5d96d6c13895da72819/s/master "wercker status")](https://app.wercker.com/project/bykey/7796fb32b691c5d96d6c13895da72819)

Gandhi is an open source, online grant management system. It is built with [node](http://nodejs.org/), uses the impeccable [rethinkdb](http://rethinkdb.com/) as its primary data store and [redis](http://redis.io/) for cluster coordination and scheduling. While it's still alpha software, it is already being used with great success by a few groups.

Installation
------------

###Install Dependencies

1. [node](http://nodejs.org/)
2. [rethinkdb](http://rethinkdb.com/docs/install/)
3. [redis](http://redis.io/download)

###Simple

Gandhi can be run as a stand-alone app. Make sure RethinkDB and redis are running on your machine. Simply clone Gandhi and start it:

```bash
git clone https://github.com/mike-marcacci/gandhi.git
cd gandhi
npm install
npm start
```


###Advanced

Gandhi is available as an NPM package, and can be used in your existing [express](https://github.com/visionmedia/express) app. This is also the best way to run Gandhi if you plan on building custom modules or using community-supported ones.

Add Gandhi as a dependency to your app:
```bash
npm install --save gandhi
```

Import gandhi and add it to your app:

```js
var app = require('express')();
var config = {
	// configure here
};

app.use(require('gandhi')(config));

app.listen(3000);
```

Configuration
-------------

```js
{
	// This is the he root path for the portal, without trailing slash. It
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
		host: '127.0.0.1'
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
	port: 3000
}
```


Demo
----

Coming Soon!

