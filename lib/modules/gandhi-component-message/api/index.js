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
				if(!content.authorizations.write) return Q.reject(new e.ForbiddenError('You are not authorized to write this content.'));
				var status_id = data.status_id || content.status_id || 'draft';

				// validate the data
				var err = data.status === 'complete' ? validator.validate(stage.component.options.schema, _.merge({}, content.data, data.data), { removeAdditional: true, checkRequired: true, useDefault: true })
				: validator.validate(stage.component.options.schema, data.data, { removeAdditional: true, useDefault: false });
				if(err) return Q.reject(new e.ValidationError('The supplied data is invalid for the "' + status_id + '" status.', err));

				return data;
			},
			save: function(data, content, stage, project, cycle) {
				if(!content.authorizations.write) return Q.reject(new e.ForbiddenError('You are not authorized to write this content.'));
				var status_id = data.status_id || content.status_id || 'draft';

				// validate the data
				var err = data.status === 'complete' ? validator.validate(stage.component.options.schema, data.data, { removeAdditional: true, checkRequired: true, useDefault: true })
				: validator.validate(stage.component.options.schema, data.data, { removeAdditional: true, useDefault: false });
				if(err) return Q.reject(new e.ValidationError('The supplied data is invalid for the "' + status_id + '" status.', err));

				return data;
			}
		}
	};
};
