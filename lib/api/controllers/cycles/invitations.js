'use strict';

var _ = require('lodash');
var r = require('rethinkdb');

module.exports = function(config, resources) {
	return require('./_base.js')('invitation', 'invitations', config, resources);

	// TODO: show/hide assignments based on role

}