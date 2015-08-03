'use strict';

var util        = require('util');
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
		throw new Error('The project and cycle must not have different user contexts.').

	// cycle
	Object.defineProperty(self, 'cycle', {
		value: cycle
	});

	// user
	Object.defineProperty(self, 'user', {
		value: user
	});

	// status
	Object.defineProperty(self, 'status', {
		enumerable: true,
		get: function(){
			return cycle.statuses.get(self.status_id);
		},
		set: function(status){
			this.status_id = status.id;
			return this.status;
		}
	});

	// role
	Object.defineProperty(self, 'role', {
		enumerable: true,
		get: function(){
			var self = this;

			// admin user
			if(self.user === true)
				return true;

			// invalid user
			if(typeof self.user !== 'object' || typeof self.user.id !== 'string')
				return false;

			// lookup role in project
			var assignment = self.assignments.get(user.id);
			if(assignment) return self.roles.get(assignment.role_id);

			// get role from cycle
			return self.cycle.role;
		}
	});

	// authorizations
	Object.defineProperty(self, 'authorizations', {
		enumerable: true,
		get: function(){

			// TODO: add authorizations to projects

			return {};
		}
	});

	return Model.call(self, data);
}


// Model Configuration
// -------------------

Project.table = 'cycles';
Project.collections = {
	assignments: Assignments,
	invitations: Invitations,
	content:     Contents
};
Project.reconstruct = function(data, old) {
	return new Project(data, old.cycle, old.user);
};
Project.validate = function(data) {
	return validator.validate('http://www.gandhi.io/schema/project', data, {useDefault: true, removeAdditional: true});
};
Project.create = function(data) {
	return new Project(data);
};



// Public Methods
// --------------

util.inherits(Project, Model);


// TODO: check authorizations for create

// TODO: check authorizations for update

// TODO: check authorizations for delete


module.exports = Project;


