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


// Schema Validator
// ----------------

var validator = require('jjv')();
validator.addSchema(require('../schemas/project'));


// Model Constructor
// -----------------

function Project (data, cycle, user) {
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

	return Model.call(self, data)
	.then(function(self) {
		return Promise.props({

			// get role
			role: (

				// admin
				self.user === true ? true :

				// project assignment
				self.assignments.get(self.user.id)

				// cycle assignment
				.catch(function(err){ return self.cycle.assignments.get(self.user.id); })

				// get the role
				.then(function(assignment){ return self.cycle.roles.get(assignment.role_id); })

				// no role
				.catch(function(err){ return false; })
			),


			// get status
			status: self.cycle.statuses.get(self.status_id)
			.catch(function(err){ return false; }),


			// TODO: process triggers???


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
Project.reconstruct = function(data, old) {
	return new Project(data, old.cycle, old.user);
};
Project.validate = function(data) {
	return validator.validate('http://www.gandhi.io/schema/project', data, {useDefault: true, removeAdditional: true});
};
Project.create = function(conn, data, cycle, user) {

	// generate a new uuid
	data.id = uuid();

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

	return new Project(data, cycle, user)
	.then(function(project){
		return project.save(conn);
	});
};



// Public Methods
// --------------

util.inherits(Project, Model);

// check authorizations for update
Project.prototype.update = function(conn, delta) {
	var self = this;

	if(!self.authorizations['project:update'])
		return Promise.reject(new errors.ForbiddenError());

	return Model.prototype.update.call(this, conn, delta);
};

// check authorizations for delete
Project.prototype.delete = function(conn) {
	var self = this;

	if(!self.authorizations['project:delete'])
		return Promise.reject(new errors.ForbiddenError());

	return Model.prototype.delete.call(this, conn);
};

// process triggers before save
Project.prototype.save = function(conn) {
	var self = this;

	// TODO: process triggers

	return Model.prototype.save.call(this, conn);
};


Project.prototype.allows = function allows(permissions) {
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
	var open = (typeof permissions[self.role.id].open === 'boolean') ? permissions[self.role.id].open : (
		permissions[self.role.id].open.any(function(id) {
			if(self.events[id] && self.events[id][0] && self.events[id][0].value === true)
				return true;
		}) || false
	);

	// calculate `close`
	var close = (typeof permissions[self.role.id].open === 'boolean') ? permissions[self.role.id].open : (
		permissions[self.role.id].open.any(function(id) {
			if(self.events[id] && self.events[id][0] && self.events[id][0].value === true)
				return true;
		}) || false
	);

	// make sure the permission has been opened, and has not been closed
	return open && !close;
};


module.exports = Project;


