'use strict';

var _ = require('lodash');
var r = require('rethinkdb');

module.exports = function(config, resources) {
	return require('../_embedded.js')('project', 'projects', 'event', 'events', config, resources);

	// TODO: show/hide assignments based on role

}