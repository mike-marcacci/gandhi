'use strict';

var Promise     = require('bluebird');
var _           = require('lodash');
var util        = require('util');
var uuid        = require('../utils/uuid');
var errors      = require('../errors');

var Model       = require('../Model');
var Assignments = require('../collections/Projects/Assignments');
var Contents    = require('../collections/Projects/Contents');
var Invitations = require('../collections/Projects/Invitations');

var Content     = require('./Project/Content.js');

// Schema Validator
// ----------------

var validator = require('jjv')();
validator.addSchema(require('../schemas/project'));


// Model Constructor
// -----------------

function Project (conn, data, cycle, user) {
	var self = this;

	if(typeof data === 'undefined' || typeof cycle === 'undefined' || typeof user === 'undefined')
		throw new Error('All constructor arguments are required by Model constructors.');

	if(user !== cycle.user || user.id !== cycle.user.id)
		throw new Error('The project and cycle must not have different user contexts.');

	// cycle
	Object.defineProperty(self, 'cycle', {
		value: cycle
	});

	// user
	Object.defineProperty(self, 'user', {
		value: user
	});

	// role
	Object.defineProperty(self, 'role', {
		configurable: true,
		enumerable: true,
		writable: true,
		value: false
	});

	// status
	Object.defineProperty(self, 'status', {
		configurable: true,
		enumerable: true,
		writable: true,
		value: null
	});

	// authorizations
	Object.defineProperty(self, 'authorizations', {
		configurable: true,
		enumerable: true,
		writable: true,
		value: {}
	});

	// make sure to add an empty content for each stage
	return self.cycle.stages.query(conn, {}).then(function(stages){
		data.contents = data.contents || {};
		stages.forEach(function(stage) {
			if(typeof data.contents[stage.id] === 'undefined') {
				data.contents[stage.id] = { id: stage.id };
				Content.validate(data.contents[stage.id]);
			}
		});
	})
	.then(function(){
		return Model.call(self, conn, data);
	})
	.then(function(self) {
		return Promise.props({

			// get role
			role: (

				// admin
				self.user === true ? true :

				// project assignment
				self.assignments.get(conn, self.user.id)

				// cycle assignment
				.catch(function(err){ return self.cycle.assignments.get(conn, self.user.id); })

				// get the role
				.then(function(assignment){ return self.cycle.roles.get(conn, assignment.role_id); })

				// no role
				.catch(function(err){ return false; })
			),


			// get status
			status: self.cycle.statuses.get(conn, self.status_id)
			.catch(function(err){ return null; }),


		})

		// apply the calculated properties
		.then(function(props){
			return _.extend(self, props);
		});
	})
	
	// calculate authorizations
	.then(function(self) {




		self.authorizations = {
			'project:create':            self.allows(self.cycle.permissions['project:create']),
			'project:read':              self.allows(self.cycle.permissions['project:read']),
			'project:update':            self.allows(self.cycle.permissions['project:update']),
			'project:delete':            self.allows(self.cycle.permissions['project:delete']),
			'project/assignments:read':  self.allows(self.cycle.permissions['project/assignments:read']),
			'project/assignments:write': self.allows(self.cycle.permissions['project/assignments:write']),
			'project/contents:read':     self.allows(self.cycle.permissions['project/contents:read']),
			'project/contents:write':    self.allows(self.cycle.permissions['project/contents:write']),
			'project/invitations:read':  self.allows(self.cycle.permissions['project/invitations:read']),
			'project/invitations:write': self.allows(self.cycle.permissions['project/invitations:write'])
		};




		return self;

	})

	// apply permissions
	.then(function(self){

		if(self.authorizations['project:read'] !== true)
			return Promise.reject(new errors.ForbiddenError());

		return self;
	});
}


// Model Configuration
// -------------------

Project.table = 'projects';
Project.collections = {
	assignments: Assignments,
	invitations: Invitations,
	contents:    Contents
};
Project.reconstruct = function(conn, data, old) {
	return new Project(conn, data, old.cycle, old.user);
};
Project.validate = function(data) {
	return validator.validate('http://www.gandhi.io/schema/project', data, {useDefault: true, removeAdditional: true});
};
Project.create = function(conn, data, cycle, user) {

	// generate a new uuid
	data.id = uuid();

	// make sure events cannot be overridden
	delete data.events;

	// apply optional defaults for admins
	if(user === true) {
		data.status_id = data.status_id || cycle.defaults.status_id;
	}

	// force defaults for non-admin users
	else {
		data.assignments = {};
		data.status_id = cycle.defaults.status_id;
		data.assignments[user.id] = {
			id: user.id,
			role_id: cycle.defaults.role_id
		};
	}

	return new Project(conn, data, cycle, user)
	.then(function(project) {
		return project.save(conn);
	});
};

// This is populated by the app on setup, and contains globally accessible actions
// TODO: this feels really dirty, and breaks some of the separation of responsibility
// that the models provide. I need to think through a cleaner way to configure this.
Project.actions = {};



// Public Methods
// --------------

util.inherits(Project, Model);

// check authorizations for update
Project.prototype.update = function(conn, delta) {
	var self = this;

	if(!self.authorizations['project:update'])
		return Promise.reject(new errors.ForbiddenError());

	// make sure events cannot be overridden
	delete delta.events;

	return Model.prototype.update.call(self, conn, delta);
};

// check authorizations for delete
Project.prototype.delete = function(conn) {
	var self = this;

	if(!self.authorizations['project:delete'])
		return Promise.reject(new errors.ForbiddenError());

	return Model.prototype.delete.call(self, conn);
};

// process triggers before save
Project.prototype.save = function(conn) {
	var self = this;

	// process triggers
	return self.processTriggers()
	.then(function(changes) {

		// update the events arrays on the project
		changes.forEach(function(change) {
			self.events[change.trigger.id] = self.events[change.trigger.id] || [];
			self.events[change.trigger.id].unshift(change.event);
		});

		// save the project
		return Model.prototype.save.call(self, conn)
		.then(function(project) {

			// loop through triggered changes
			return Promise.map(changes, function(change) {

				// ignore events with a value of false
				if(!change.event.value)
					return;

				// loop through all configured action
				return Promise.map(change.trigger.actions, function(action) {

					if(typeof Project.actions[action.name] !== 'function')
						return Promise.reject(new Error('The action "' + action.name + '" is not installed.'));

					// perform the action
					return Project.actions[action.name](conn, project, action.options);
				});
			})

			// return the project
			.then(function(){ return project; });
		});
	})

	.then(function(promiseInspections) {
		return Model.prototype.save.call(self, conn);
	});
};


Project.prototype.processTriggers = function(conn) {
	var self = this;
	var events = [];

	self.events = self.events || {};
	return self.cycle.triggers.query(conn, {})
	.each(function(trigger) {

		// test the trigger
		return trigger.test(conn, self)
		.then(function(bool) {

			// nothing has changed
			if(self.events[trigger.id] && self.events[trigger.id][0] && self.events[trigger.id][0].value === bool )
				return;

			// add the new event
			events.push({
				trigger: trigger,
				event: {
					value: bool,
					timestamp: Date.now()
				}
			});
		});
	})

	// return all new events
	.then(function(){
		return events;
	});
};


Project.prototype.allows = function(permissions) {
	var self = this;

	// admin or unassigned
	if(typeof self.role === 'boolean')
		return self.role;

	// role not specified in permissions
	if(typeof permissions[self.role.id] === 'undefined')
		return false;

	// static permission
	if(typeof permissions[self.role.id] === 'boolean')
		return permissions[self.role.id];

	// calculate `open`
	self.events = self.events || {};
	var open = !Array.isArray(permissions[self.role.id].open) ? !!permissions[self.role.id].open : (
		permissions[self.role.id].open.some(function(id) {
			if(self.events[id] && self.events[id][0] && self.events[id][0].value === true)
				return true;
		}) || false
	);

	// calculate `close`
	var close = !Array.isArray(permissions[self.role.id].close) ? !!permissions[self.role.id].close : (
		permissions[self.role.id].close.some(function(id) {
			if(self.events[id] && self.events[id][0] && self.events[id][0].value === true)
				return true;
		}) || false
	);

	// make sure the permission has been opened, and has not been closed
	return open && !close;
};


module.exports = Project;


