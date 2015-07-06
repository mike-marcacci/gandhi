'use strict';

var r = require('rethinkdb');
var _ = require('lodash');
var Q = require('q');

var errors = require('../errors');
var EmbeddedCollection = require('../EmbeddedCollection');


// Embedded Models
var Assignment = require('./Cycle/Assignment');
var Invitation = require('./Cycle/Invitation');
var Role       = require('./Cycle/Role');
var Stage      = require('./Cycle/Stage');
var Status     = require('./Cycle/Status');
var Trigger    = require('./Cycle/Trigger');

function Cycle (data) {
	var self = this;


	// Add Embedded Collections
	// ------------------------

	// assignments
	Object.defineProperty(self, 'assignments', {
		value: new EmbeddedCollection(Assignment, data.assignments, self)
	});

	// invitations
	Object.defineProperty(self, 'invitations', {
		value: new EmbeddedCollection(Invitation, data.invitations, self)
	});

	// roles
	Object.defineProperty(self, 'roles', {
		value: new EmbeddedCollection(Role, data.roles, self)
	});

	// stages
	Object.defineProperty(self, 'stages', {
		value: new EmbeddedCollection(Stage, data.stages, self)
	});

	// statuses
	Object.defineProperty(self, 'statuses', {
		value: new EmbeddedCollection(Status, data.statuses, self)
	});

	// triggers
	Object.defineProperty(self, 'triggers', {
		value: new EmbeddedCollection(Trigger, data.triggers, self)
	});



	// Attach Data
	// -----------

	_.defaults(self, data);

}


Object.defineProperty(Cycle, 'collections', {
	value: [
		'assignments',
		'invitations',
		'roles',
		'stages',
		'statuses',
		'triggers'
	]
});



Cycle.applyUser = function(cycle, user) {

	// get the role
	var assignment, role = null;
	if(typeof user === 'object' && !user.id) {
		assignment = cycle.assignments.get(user.id);
		if(assignment) role = cycle.roles.get(assignment.role_id) || role;
	}

	// extend the cycle
	return Object.create(cycle, {
		role: { value: role }
	});
};



Cycle.prototype.$save = function(conn, data) {
	var self = this;

	// TODO: strip any embedded collections from data

	// TODO: validate against schema

	// save, taking care not to modify any embedded collections
	r.table('cycles').get(self.id).replace(function(old) {
		r.expr(data).merge(old.pluck(Cycle.collections));
	}).run(conn);
};



Cycle.prototype.$update = function(conn, delta) {
	var self = this;

	// merge with existing data
	var data = _(self).cloneDeep.merge(delta).unwrap();

	// save
	return self.$save(conn, data);
};



Cycle.prototype.$delete = function(conn) {
	var self = this;

	// delete the record
	return r.table('cycles').get(self.id).delete().run(conn)

	// return the old value
	.then(function(){
		return self;
	});
};