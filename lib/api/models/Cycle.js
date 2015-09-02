'use strict';

var Promise     = require('bluebird');
var _           = require('lodash');
var util        = require('util');
var uuid        = require('../utils/uuid');
var errors      = require('../errors');

var Model       = require('../Model');
var Assignments = require('../collections/Cycles/Assignments');
var Invitations = require('../collections/Cycles/Invitations');
var Roles       = require('../collections/Cycles/Roles');
var Stages      = require('../collections/Cycles/Stages');
var Statuss     = require('../collections/Cycles/Statuses');
var Triggers    = require('../collections/Cycles/Triggers');


// Schema Validator
// ----------------

var validator = require('jjv')();
validator.addSchema(require('../schemas/cycle'));


// Model Constructor
// -----------------

function Cycle (conn, data, user) {
	var self = this;

	if(typeof data === 'undefined' || typeof user === 'undefined')
		throw new Error('All constructor arguments are required by Model constructors.');

	// user
	Object.defineProperty(self, 'user', {
		value: user
	});

	return Model.call(self, conn, data)
	.then(function(self) {
		return Promise.props({

			// get role
			role: (

				// admin
				self.user === true ? true :

				// project assignment
				self.assignments.get(self.user.id)

				// get the role
				.then(function(assignment){ return self.cycle.roles.get(assignment.role_id); })

				// no role
				.catch(function(err){ return false; })
			)

		})

		// apply the calculated properties
		.then(function(props){
			return _.extend(self, props);
		});
	})

	// authorizations
	.then(function(self){
		self.authorizations = {
			'cycle:create':            self.user === true,
			'cycle:read':              self.user === true || self.status_id !== 'draft',
			'cycle:update':            self.user === true,
			'cycle:delete':            self.user === true,
			'cycle/assignments:read':  self.user === true || self.status_id !== 'draft',
			'cycle/assignments:write': self.user === true,
			'cycle/invitations:read':  self.user === true || self.status_id !== 'draft',
			'cycle/invitations:write': self.user === true,
			'cycle/roles:read':        self.user === true || self.status_id !== 'draft',
			'cycle/roles:write':       self.user === true,
			'cycle/stages:read':       self.user === true || self.status_id !== 'draft',
			'cycle/stages:write':      self.user === true,
			'cycle/statuses:read':     self.user === true || self.status_id !== 'draft',
			'cycle/statuses:write':    self.user === true,
			'cycle/triggers:read':     self.user === true || self.status_id !== 'draft',
			'cycle/triggers:write':    self.user === true
		};


		// open
		self.options = self.options || {};
		var open = typeof self.options.open === 'number' ? Date.now() > new Date(self.options.open * 1000).getTime() : !!self.options.open;
		var close = typeof self.options.close === 'number' ? Date.now() > new Date(self.options.close * 1000).getTime() : !!self.options.close;
		self.open = open && !close;


		return self;
	})

	// apply permissions
	.then(function(self){

		if(self.authorizations['cycle:read'] !== true)
			return Promise.reject(new errors.ForbiddenError());

		return self;
	});
}


// Model Configuration
// -------------------

Cycle.table = 'cycles';
Cycle.collections = {
	assignments: Assignments,
	invitations: Invitations,
	roles:       Roles,
	stages:      Stages,
	statuses:    Statuss,
	triggers:    Triggers
};
Cycle.reconstruct = function(conn, data, old) {
	return new Cycle(conn, data, old.user);
};
Cycle.validate = function(data) {
	return validator.validate('http://www.gandhi.io/schema/cycle', data, {useDefault: true, removeAdditional: true});
};
Cycle.create = function(conn, data, user) {

	// restrict to admin
	if(user !== true)
		return Promise.reject(new errors.ForbiddenError());

	// generate a new uuid
	data.id = uuid();

	return new Cycle(conn, data, user)
	.then(function(cycle){
		return cycle.save(conn);
	});
};



// Public Methods
// --------------

util.inherits(Cycle, Model);

// check authorizations for update
Cycle.prototype.update = function(conn, delta) {
	var self = this;

	if(!self.authorizations['cycle:update'])
		return Promise.reject(new errors.ForbiddenError());

	return Model.prototype.update.call(this, conn, delta);
};

// check authorizations for delete
Cycle.prototype.delete = function(conn) {
	var self = this;

	if(!self.authorizations['cycle:delete'])
		return Promise.reject(new errors.ForbiddenError());

	return Model.prototype.delete.call(this, conn);
};


module.exports = Cycle;
