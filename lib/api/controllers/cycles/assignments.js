'use strict';

var _ = require('lodash');
var r = require('rethinkdb');

module.exports = function(config, resources) {
	return require('../_embedded.js')('cycle', 'cycles', 'assignment', 'assignments', config, resources);
}