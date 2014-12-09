'use strict';

var fs = require('fs');
var app = require('express')();
var config = fs.existsSync('./config.json') || fs.existsSync('./config.js') || fs.existsSync('./config/index.js') ? require('./config') : require('./config.default.js');

// setup the environment
require('./setup/index.js')(config);

// bring in gandhi
app.use(require('./lib/index.js')(config));

app.listen(config.port);
