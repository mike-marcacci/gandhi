'use strict';

var Promise = require('bluebird');
var util    = require('util');
var Model   = require('../Model');
var uuid    = require('../utils/uuid');
var errors  = require('../errors');


// Schema Validator
// ----------------

var validator = require('jjv')();
validator.addSchema(require('../schemas/notification'));


// Model Constructor
// -----------------

function Notification (conn, data, user) {
	var self = this;

	if(typeof data === 'undefined' || typeof user === 'undefined')
		throw new Error('All constructor arguments are required by Model constructors.');

	// user
	Object.defineProperty(self, 'user', {
		value: user
	});

	return Model.call(self, conn, data)
	.then(function(self) {

		// restrict non-admin user to self
		if(self.user !== true && self.user.id !== self.user_id)
			return Promise.reject(new errors.ForbiddenError());

		return self;
	});
}


// Model Configuration
// -------------------

Notification.table = 'notifications';
Notification.collections = {};
Notification.reconstruct = function(conn, data, old) {
	return new Notification(conn, data, old.user);
};
Notification.validate = function(data) {
	return validator.validate('http://www.gandhi.io/schema/notification', data, {useDefault: true, removeAdditional: true});
};
Notification.create = function(conn, data, user, listeners) {

	// restrict to admin
	if(user !== true)
		return Promise.reject(new errors.ForbiddenError());

	// generate a new uuid
	data.id = uuid();

	return new Notification(conn, data, user)

	// add listeners
	.then(function(notification) {
		if(!Array.isArray(listeners) || !listeners.length)
			return notification;

		listeners.forEach(function(args) {
			notification.on.apply(notification, args);
		});

		return notification;
	})

	// save notification
	.then(function(notification){
		return notification.save(conn);
	});
};



// Public Methods
// --------------

util.inherits(Notification, Model);


// restrict to admin for update
Notification.prototype.update = function(conn, data) {
	var self = this;

	var keys = Object.keys(data);

	// restrict any non-status updates to admin
	if( self.user !== true && (keys.length !== 1 || typeof data.status_id !== 'string') )
		return Promise.reject(new errors.ForbiddenError());

	return Model.prototype.update.call(self, conn, data);
};


// restrict to admin for delete
Notification.prototype.delete = function(conn) {
	var self = this;

	// restrict to admin
	if(self.user !== true)
		return Promise.reject(new errors.ForbiddenError());

	return Model.prototype.delete.call(self, conn);
};


module.exports = Notification;
