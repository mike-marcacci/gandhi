'use strict';

var Q = require('q');
var _ = require('lodash');

module.exports = function(router, resources){
	resources.components.form = {
		stage: {
			get: function(stage, cycle) {
				return stage;
			},
			update: function(data, stage, cycle) {
				return data;
			},
			save: function(data, stage, cycle) {
				return data;
			}
		},
		content: {
			get: function(content, stage, project, cycle) {
				if(!content.authorizations['read']) return _.extend({}, content, {data: {}});
				return content;
			},
			update: function(data, content, stage, project, cycle) {
				if(!content.authorizations['write']) return Q.reject({code: 403, message: 'You are not authorized to write this content.'});
				return data;
			},
			save: function(data, content, stage, project, cycle) {
				if(!content.authorizations['write']) return Q.reject({code: 403, message: 'You are not authorized to write this content.'});
				return data;
			}
		}
	};
};
