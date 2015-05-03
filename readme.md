-
-
**We are actively looking for contributors, and are willing to pay for quality pull requests! If you are at all interested, please [send Mike an email](mailto:mike.marcacci@gmail.com)!**

-
-

Gandhi
======

[![wercker status](https://app.wercker.com/status/7796fb32b691c5d96d6c13895da72819/m "wercker status")](https://app.wercker.com/project/bykey/7796fb32b691c5d96d6c13895da72819)

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

Coming Soon!


Demo
----

Coming Soon!

