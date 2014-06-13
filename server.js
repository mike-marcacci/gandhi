'use strict';

var fs = require('fs');
var express = require('express');
var app = express();
var config = fs.existsSync('./config.json') || fs.existsSync('./config.js') ? require('./config') : require('./config.default.js');

// bring in gandhi
require('./lib/index.js')(config, app)

app.listen(config.port);
