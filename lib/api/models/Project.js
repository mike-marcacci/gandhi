'use strict';

var r = require('rethinkdb');
var _ = require('lodash');
var Q = require('q');

var errors = require('../errors');
var EmbeddedCollection = require('../EmbeddedCollection');
var Cycle = require('./Cycle');

// Embedded Models
var Assignment = require('./Project/Assignment');
var Content    = require('./Project/Content');
var Invitation = require('./Project/Invitation');

function Project (data, cycle) {
	var self = this;


	// Add Embedded Collections
	// ------------------------

	// assignments
	Object.defineProperty(self, 'assignments', {
		value: new EmbeddedCollection(Assignment, data.assignments, self)
	});

	// contents
	Object.defineProperty(self, 'contents', {
		value: new EmbeddedCollection(Content, data.contents, self)
	});

	// invitations
	Object.defineProperty(self, 'invitations', {
		value: new EmbeddedCollection(Invitation, data.invitations, self)
	});



	// Add Relationships
	// -----------------

	// cycle
	Object.defineProperty(self, 'cycle', {
		value: cycle
	});



	// Attach Data
	// -----------

	_.defaults(self, data);



	// Add Aliases
	// -----------

	// status
	Object.defineProperty(self, 'status', {
		value: cycle.statuses.get(self.status_id)
	});



}

Object.defineProperty(Project, 'collections', {
	value: [
		'assignments',
		'contents',
		'invitations'
	]
});


Project.applyUser = function(project, user) {

	var cycle = Cycle.applyUser(project.cycle, user);

	// get the role
	var assignment, role = cycle.role;
	if(typeof user === 'object' && !user.id) {
		assignment = project.assignments.get(user.id);
		if(assignment) role = cycle.roles.get(assignment.role_id) || role;
	}

	// TODO: calculate permissions
	var permissions = {};

	// extend the project
	return Object.create(cycle, {
		role: { value: role },
		cycle: { value: cycle },
		permissions: { value: permissions}
	});
};



Project.prototype.$save = function(conn, data) {
	var self = this;

	// TODO: strip any embedded collections from data

	// TODO: validate against schema

	// save, taking care not to modify any embedded collections
	r.table('projects').get(self.id).replace(function(old) {
		r.expr(data).merge(old.pluck(Project.collections));
	}).run(conn);

};



Project.prototype.$update = function(conn, delta) {
	var self = this;

	// merge with existing data
	var data = _(self).cloneDeep.merge(delta).unwrap();

	// save
	return self.$save(conn, data);
};



Project.prototype.$delete = function(conn) {
	var self = this;

	// delete the record
	return r.table('projects').get(self.id).delete().run(conn)

	// return the old value
	.then(function(){
		return self;
	});
};