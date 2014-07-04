'use strict';

var _ = require('lodash');
var express = require('express');

module.exports = {
	setup: function(done){
		var app = express();
		require("../../lib/index.js")(global.setup.config, app)
		global.setup.api = require("supertest")(app);
		done();
	},
	teardown: function(done){
		done();
	}
};
