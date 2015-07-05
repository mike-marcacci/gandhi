'use strict';

var _ = require('lodash');
var Q = require('q');
var Handlebars = require('handlebars');

var e = require('../../../api/errors.js');
var validator = require('jjv')();

module.exports = function(router, resources){
	resources.components.form = {
		stage: {
			get: function(stage, cycle) {
				return stage;
			},
			update: function(input, stage, cycle) {
				var result = _.merge({}, stage, input);

				// assign any set options options
				if(input.component && input.component.options)
					result.component.options = _.assign({}, stage.component.options, input.component.options);

				// build manifest from schema
				if(result.component.options.schema && result.component.options.schema.properties) {
					result.component.manifest = {};
					Object.keys(result.component.options.schema.properties).map(function(key){
						result.component.manifest[key] = {
							id: key,
							title: result.component.options.schema.properties[key].title || '',
							schema: result.component.options.schema.properties[key]
						};
					});
				}

				return result;
			},
			save: function(input, stage, cycle) {
				return input;
			}
		},
		content: {
			get: function(content, stage, project, cycle) {

				// Note: it is an extremely bad idea to modify "exports" when reading, because
				// trigger comparisons and server-side template rendering do not use this
				// function. Instead, only export durable values, calculating them on write.
				//
				// If an exported value is time-dependent, schedule a refresh (update with {})
				// at the desired time.

				if(!content.authorizations.read) return _.extend({}, content, {data: {}});


				if(stage.component.options.instructions)
					content.data.instructions = Handlebars.compile(stage.component.options.instructions)({ project: project, cycle: cycle, stage: stage });


				return content;
			},
			update: function(input, content, stage, project, cycle) {
				if(!content.authorizations.write) return Q.reject(new e.ForbiddenError('You are not authorized to write this content.'));
				var status_id = input.status_id || content.status_id || 'draft';
				var form = status_id === 'complete' ? _.merge({}, content.data.form || {}, input.data ? input.data.form || {} : {}) : input.data.form || {};

				// validate the input data data
				var err = status_id === 'complete' ? validator.validate(stage.component.options.schema, form, { removeAdditional: true, checkRequired: true, useDefault: true })
				: validator.validate(stage.component.options.schema, form, { removeAdditional: true, checkRequired: false, useDefault: false });
				if(err) return Q.reject(new e.ValidationError('The supplied data is invalid for the "' + status_id + '" status.', err));

				return {
					id: content.id,
					status_id: status_id,
					data: {form: form},
					exports: form
				};
			},
			save: function(input, content, stage, project, cycle) {
				if(!content.authorizations.write) return Q.reject(new e.ForbiddenError('You are not authorized to write this content.'));
				var status_id = input.status_id || content.status_id || 'draft';
				var form = input.data ? input.data.form || {} : {};

				// validate the data
				var err = status_id === 'complete' ? validator.validate(stage.component.options.schema, form, { removeAdditional: true, checkRequired: true, useDefault: true })
				: validator.validate(stage.component.options.schema, form, { removeAdditional: true, checkRequired: false, useDefault: false });
				if(err) return Q.reject(new e.ValidationError('The supplied data is invalid for the "' + status_id + '" status.', err));

				return {
					id: content.id,
					status_id: status_id,
					data: {form: form},
					exports: form
				};
			}
		}
	};
};
