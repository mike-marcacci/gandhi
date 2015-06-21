'use strict';

var _ = require('lodash');
var Q = require('q');

var e = require('../../../api/errors.js');
var validator = require('jjv')();

module.exports = function(router, resources){
	resources.components.form = {
		stage: {
			get: function(stage, cycle) {
				return stage;
			},
			update: function(data, stage, cycle) {
				return _.merge({}, stage, data);
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
			update: function(input, content, stage, project, cycle) {
				if(!content.authorizations.write) return Q.reject(new e.ForbiddenError('You are not authorized to write this content.'));
				var status_id = input.status_id || content.status_id || 'draft';
				var data = status_id === 'complete' ? _.merge({}, content.data, input.data) : input.data;

				// validate the input data data
				var err = status_id === 'complete' ? validator.validate(stage.component.options.schema, data, { removeAdditional: true, checkRequired: true, useDefault: true })
				: validator.validate(stage.component.options.schema, data, { removeAdditional: true, checkRequired: false, useDefault: false });
				if(err) return Q.reject(new e.ValidationError('The supplied data is invalid for the "' + status_id + '" status.', err));

				return {
					id: content.id,
					status_id: status_id,
					data: data,
					exports: data
				};
			},
			save: function(input, content, stage, project, cycle) {
				if(!content.authorizations.write) return Q.reject(new e.ForbiddenError('You are not authorized to write this content.'));
				var status_id = input.status_id || content.status_id || 'draft';
				var data = input.data;

				// validate the data
				var err = status_id === 'complete' ? validator.validate(stage.component.options.schema, data, { removeAdditional: true, checkRequired: true, useDefault: true })
				: validator.validate(stage.component.options.schema, data, { removeAdditional: true, checkRequired: false, useDefault: false });
				if(err) return Q.reject(new e.ValidationError('The supplied data is invalid for the "' + status_id + '" status.', err));

				return {
					id: content.id,
					status_id: status_id,
					data: data,
					exports: data
				};
			}
		}
	};
};
