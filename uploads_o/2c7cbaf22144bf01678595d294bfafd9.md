Gandhi
======

Installation
------------

###Install Dependencies

1. [node](http://nodejs.org/)
2. [rethinkdb](http://rethinkdb.com/docs/install/)

###Simple

Gandhi can be run as a stand-alone app. Simply clone and start it:

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

In your app, apply the package to your express app:
```js
var app = require('express')();
var config = {
	// configure here
};

require('gandhi')(config, app);

app.listen(3000);
```

Configuration
-------------


