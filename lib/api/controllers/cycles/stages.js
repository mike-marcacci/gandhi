'use strict';

var _ = require('lodash');
var r = require('rethinkdb');

module.exports = function(config, resources) {
	return require('../_embedded.js')('cycle', 'cycles', 'stage', 'stages', config, resources);
}