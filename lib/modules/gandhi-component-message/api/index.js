'use strict';

var Q = require('q');
var _ = require('lodash');

var e = require('../../../api/errors.js');
var validator = require('jjv')();

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
				if(!content.authorizations.read) return _.extend({}, content, {data: {}});
				return content;
			},
			update: function(data, content, stage, project, cycle) {
				return content;
			},
			save: function(data, content, stage, project, cycle) {
				return content;
			}
		}
	};
};
