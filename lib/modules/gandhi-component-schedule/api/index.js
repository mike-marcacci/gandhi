'use strict';

var Q = require('q');
var _ = require('lodash');
var errors = require('../../../api/errors');

module.exports = function(router, resources){
	resources.components.schedule = {
		stage: {
			read: function(stage) {
				return stage;
			},
			write: function(data, stage) {
				return _.merge({}, stage, data);
			}
		},
		content: {
			read: function(content, stage) {
				if(!content.authorizations.read) return _.extend({}, content, {data: {}});
				return content;
			},
			write: function(data, content, stage) {
				if(!content.authorizations.write) return Q.reject(new errors.UnauthorizedError('You are not authorized to write this content.'));
				return data;
			}
		}
	};
};
