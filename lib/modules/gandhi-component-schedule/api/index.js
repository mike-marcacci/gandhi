'use strict';

var _ = require('lodash');
var Q = require('q');
var Handlebars = require('handlebars');

var errors = require('../../../api/errors.js');
var validator = require('jjv')();

module.exports = function(router, resources){
	resources.components.schedule = {
		stage: {
			get: function(stage, cycle) {
				return stage;
			},
			update: function(input, stage, cycle) {
				var result = _.merge({}, stage, input);

				// assign any set options
				if(input.component && input.component.options)
					result.component.options = _.assign({}, stage.component.options, input.component.options);

				// build manifest from schema
				result.component.manifest = {
					begin: {
						id: 'begin',
						title: 'Start Time',
						schema: {
							type: ['null', 'number']
						}
					}
				};

				// make sure permissions are listed
				if(result.component && result.component.permissions) {
					result.component.permissions.read = result.component.permissions.read || {};
					result.component.permissions.write = result.component.permissions.write || {};
				}

				return result;
			},
			save: function(input, stage, cycle) {

				// make sure permissions are listed
				input.component.permissions.read = input.component.permissions.read || {};
				input.component.permissions.write = input.component.permissions.write || {};

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


				// hide data from those without read authorization
				if(!content.authorizations.read)
					return _.extend({}, content, {data: {}});


				// make sure the component-specific data exists
				content.data.slot_id = content.data.slot_id || {};
				content.data.instructions = content.data.instructions || null;

				// compile instructions
				if(stage.component.options.instructions)
					try { content.data.instructions = Handlebars.compile(stage.component.options.instructions)({ project: project, cycle: cycle, stage: stage }); } catch (e) {}


				return content;
			},
			update: function(input, content, stage, project, cycle, conn) {
				input.data = input.data || {};
				stage.component.options.slots = stage.component.options.slots || {};

				if(!content.authorizations.write) return Q.reject(new errors.ForbiddenError('You are not authorized to write this content.'));
				var status_id = input.status_id || (content.status_id && content.status_id !== 'none' ? content.status_id : 'draft');
				var slot_id = input.data.slot_id || content.data.slot_id || null;

				// get the slot
				var slot = stage.component.options.slots[slot_id] || null;

				// make sure the slot is available
				if(slot.project_id && slot.project_id !== project.id)
					return Q.reject(new errors.ValidationError('This slot is already taken by another project.'));

				return Q.when(function(){

					// nothing to change
					if(!slot || !input.data.slot_id) return stage;

					// reserve the new slot
					var slots = stage.component.options.slots;
					slot.project_id = project.id;

					// release the old slot
					if(content.data.slot_id && slots[content.data.slot_id] && content.data.slot_id !== input.data.slot_id)
						slots[content.data.slot_id].project_id = null;

					return resources.collections.Stage.update(conn, cycle.id, stage.id, { component: { options: { slots: stage.component.options.slots } } }, true);
				}())

				.then(function(stage){

					// make sure a slot has been chosen if we're "complete" status
					if(status_id === 'complete' && !slot)
						return Q.reject(new errors.ValidationError('You must choose a valid slot.'));

					// return the updated content
					return {
						id: content.id,
						status_id: status_id,
						data: {
							slot_id: slot_id
						},
						exports: {
							begin: slot ? slot.begin : null
						}
					};
				});
			},
			save: function(input, content, stage, project, cycle) {
				return Q.reject(new errors.ValidationError('Method not supported for the schedule component.'));
			}
		}
	};
};
