'use strict';

var fs = require('fs');
var app = require('express')();
var config = fs.existsSync('./config.json') || fs.existsSync('./config.js') || fs.existsSync('./config/index.js') ? require('./config') : require('./config.default.js');

// setup the environment
require('./setup/index.js')(config);

// bring in gandhi
app.use(require('./lib/index.js')(config));

// this needs to be here because Angular is stupid, and fails to use any sensible query sting
// format... we need to find a better way to fix this, probably on the client side.
app.set('query parser', 'simple');

app.listen(config.port);
