'use strict';

var _ = require('lodash');
var r = require('rethinkdb');

module.exports = function(config, resources) {
	return require('./_base.js')('status', 'statuses', config, resources);
}