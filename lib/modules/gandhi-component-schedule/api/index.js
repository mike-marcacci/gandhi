'use strict';

var _ = require('lodash');
var errors = require('../../../api/errors');
var Handlebars = require('handlebars');

var Cycle = require('../../../../lib/api/models/Cycle');

module.exports = function(router, resources){
	resources.components.schedule = {
		stage: {
			read: function(conn, stage) {
				return stage;
			},
			write: function(conn, data, stage) {
				var result = _.merge({}, stage, data);

				// assign any set options
				if(data.component && data.component.options)
					result.component.options = _.assign({}, stage.component.options, data.component.options);

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
			}
		},
		content: {
			read: function(conn, content, stage) {
				var project = content.parent;
				var cycle = stage.parent;

				if(!content.authorizations.read) return _.extend({}, content, {data: {}});
				
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
			write: function(conn, data, content, stage) {
				var project = content.parent;
				var cycle = stage.parent;
				
				if(!content.authorizations.write) return Promise.reject(new errors.UnauthorizedError('You are not authorized to write this content.'));
				
				data.data = data.data || {};
				stage.component.options.slots = stage.component.options.slots || {};

				if(!content.authorizations.write) return Promise.reject(new errors.ForbiddenError('You are not authorized to write this content.'));
				var status_id = data.status_id || (content.status_id && content.status_id !== 'none' ? content.status_id : 'draft');
				var slot_id = typeof data.data.slot_id === 'undefined' ? content.data.slot_id : data.data.slot_id;

				// get the slot
				var slot = stage.component.options.slots[slot_id] || null;

				// make sure the slot is available
				if(slot && slot.project_id && slot.project_id !== project.id)
					return Promise.reject(new errors.ValidationError('This slot is already taken by another project.'));

				return Promise.resolve().then(function(){

					// nothing to change
					if(!slot || !data.data.slot_id) return stage;

					// reserve the new slot
					var slots = stage.component.options.slots;
					slot.project_id = project.id;

					// release the old slot
					if(content.data.slot_id && slots[content.data.slot_id] && content.data.slot_id !== data.data.slot_id)
						slots[content.data.slot_id].project_id = null;

					// update the stage (as an admin)
					return cycle.raw()
					.then(function(raw)   { return new Cycle(conn, raw, true); })
					.then(function(cycle) { return cycle.stages.get(conn, stage.id); })
					.then(function(stage) { return stage.update(conn, cycle.id, stage.id, {component: {options: {
						slots: slots
					}}}, true); });
				})

				.then(function(stage){

					// make sure a slot has been chosen if we're "complete" status
					if(status_id === 'complete' && !slot)
						return Promise.reject(new errors.ValidationError('You must choose a valid slot.'));

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
			}
		}
	};
};
