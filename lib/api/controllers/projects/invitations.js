'use strict';

var _ = require('lodash');
var r = require('rethinkdb');

module.exports = function(config, resources) {
	return _.extend(require('../_embedded.js')('project', 'projects', 'invitation', 'invitations', config, resources), {

		// TODO: show/hide assignments based on role

		// TODO: don't accept new put requests

		// TODO: post with r.uuid()
		post: function(req, res, next){
			return next({code: 405});
		}
		
	});
}