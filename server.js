'use strict';

var fs = require('fs');
var express = require('express');
var app = express();
var config = fs.existsSync('./config.json') || fs.existsSync('./config.js') ? require('./config') : require('./config.default.js');

// bring in gandhi
app.use(require('./lib/index.js')(config));

app.listen(config.port);
