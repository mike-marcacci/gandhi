'use strict';

var _ = require('lodash');
var Q = require('q');
var Handlebars = require('handlebars');

var errors = require('../../../api/errors.js');
var validator = require('jjv')();

module.exports = function(router, resources){
	resources.components.form = {
		stage: {
			read: function(conn, stage) {
				return stage;
			},
			write: function(conn, input, stage) {
				var result = _.merge({}, stage, input);

				// assign any set options
				if(input.component && input.component.options)
					result.component.options = _.assign({
						schema: {
							type: 'object',
							properties: {}
						},
						form: ['*'],
						instructions: '',
						instructionsCols: 5,
						draftButton: true,
						draftButtonText: 'Save Draft',
						submitButtonText: 'Submit'
					}, stage.component.options, input.component.options);

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

				// make sure permissions are listed
				if(result.component && result.component.permissions) {
					result.component.permissions.read = result.component.permissions.read || {};
					result.component.permissions.write = result.component.permissions.write || {};
				}

				return result;
			}
		},
		content: {
			read: function(conn, content, stage) {
				var project = content.parent;
				var cycle = stage.parent;
				

				// Note: it is an extremely bad idea to modify "exports" when reading, because
				// trigger comparisons and server-side template rendering do not use this
				// function. Instead, only export durable values, calculating them on write.
				//
				// If an exported value is time-dependent, schedule a refresh (update with {})
				// at the desired time.


				// hide data from those without read authorization
				if(!content.authorizations.read)
					return _.extend({}, content, {data: {}});


				// make sure the component-specific data exists
				content.data.form = content.data.form || {};
				content.data.instructions = content.data.instructions || null;

				// compile instructions
				if(stage.component.options.instructions)
					try { content.data.instructions = Handlebars.compile(stage.component.options.instructions)({ project: project, cycle: cycle, stage: stage }); } catch (e) {}


				return content;
			},
			write: function(conn, input, content, stage) {
				var project = content.parent;
				var cycle = stage.parent;

				if(!content.authorizations.write) return Q.reject(new errors.ForbiddenError('You are not authorized to write this content.'));
				var status_id = input.status_id || (content.status_id && content.status_id !== 'none' ? content.status_id : 'draft');
				var form = status_id === 'complete' ? _.merge({}, content.data.form || {}, input.data ? input.data.form || {} : {}) : input.data.form || {};

				// validate the input data data
				var err = status_id === 'complete' ? validator.validate(stage.component.options.schema, form, { removeAdditional: true, checkRequired: true, useDefault: true })
				: validator.validate(stage.component.options.schema, form, { removeAdditional: true, checkRequired: false, useDefault: false });
				if(err) return Q.reject(new errors.ValidationError('The supplied data is invalid for the "' + status_id + '" status.', err));

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
