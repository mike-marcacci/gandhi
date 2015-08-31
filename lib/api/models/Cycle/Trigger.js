'use strict';

var util          = require('util');
var Promise       = require('bluebird');
var uuid          = require('../../utils/uuid');
var errors        = require('../../errors');
var EmbeddedModel = require('../../EmbeddedModel');


// Schema Validator
// ----------------

var validator = require('jjv')();
validator.addSchema(require('../../schemas/cycle'));


// EmbeddedModel Constructor
// -------------------------

function Trigger (conn, data, parent) {
	return EmbeddedModel.call(this, conn, data, parent)
	.then(function(self) {

		// check authorizations
		if(!self.parent.authorizations['cycle/triggers:read'])
			return Promise.reject(new errors.ForbiddenError());

		return self;
	});
}


// EmbeddedModel Configuration
// ---------------------------

Trigger.key = 'triggers';
Trigger.collections = {};
Trigger.validate = function(data) {
	return validator.validate('http://www.gandhi.io/schema/cycle#/definitions/trigger', data, {useDefault: true, removeAdditional: true});
};
Trigger.create = function(conn, data, parent) {
	
	if(!parent.authorizations['cycle/triggers:write'])
		return Promise.reject(new errors.ForbiddenError());

	// generate a new uuid
	data.id = uuid();

	var err = Trigger.validate(data);
	if(err) return Promise.reject(new errors.ValidationError('The input is invalid.', err));

	return new Trigger(conn, data, parent)
	.then(function(trigger) {
		return trigger.save(conn);
	});
};


// Public Methods
// --------------

util.inherits(Trigger, EmbeddedModel);


// check authorizations for update
Trigger.prototype.update = function(conn, delta) {
	var self = this;

	if(!self.parent.authorizations['cycle/triggers:write'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedModel.prototype.update.call(this, conn, delta);
};

// check authorizations for delete
Trigger.prototype.delete = function(conn) {
	var self = this;

	if(!self.parent.authorizations['cycle/triggers:write'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedModel.prototype.delete.call(this, conn);
};

Trigger.prototype.test = function(conn, project) {
	var self = this;

	return Promise.all(self.conditions.map(function(groups) {
		return Promise.all(groups.map(function(rules) {
			return testCondition(conn, rules, project);
		}))
		.then(function(bools) {
			return bools.every(function(bool) { return bool; });
		});
	}))
	.then(function(bools) {
		return bools.some(function(bool) { return bool; });
	});
};

function testCondition(conn, condition, project) {

	// date
	if(condition.name === 'date')
		return Date.now() > condition.options.timestamp ? !condition.invert : condition.invert;

	// project status
	if(condition.name === 'project_status')
		return project.status_id === condition.options.status_id ? !condition.invert : condition.invert;

	// content status
	if(condition.name === 'content_status')
		return Promise.resolve(project.contents.data[condition.options.content_id])
		.then(function(content) {
			return content && content.status_id === condition.options.status_id;
		})
		.then(function(bool) {
			return bool ? !condition.invert : condition.invert;
		});

	// export
	if(condition.name === 'export')
		return Promise.resolve(project.contents.data[condition.options.content_id])
		.then(function(content) {

			try {

				if(condition.options.op === 'eq')
					return content.exports[condition.options.export_id] === condition.options.value;

				if(condition.options.op === 'ne')
					return content.exports[condition.options.export_id] !== condition.options.value;

				if(condition.options.op === 'gt')
					return content.exports[condition.options.export_id] > condition.options.value;

				if(condition.options.op === 'gte')
					return content.exports[condition.options.export_id] >= condition.options.value;

				if(condition.options.op === 'lt')
					return content.exports[condition.options.export_id] < condition.options.value;

				if(condition.options.op === 'lte')
					return content.exports[condition.options.export_id] <= condition.options.value;

				if(condition.options.op === 'matches')
					return !!content.exports[condition.options.export_id].match(condition.options.value);

				if(condition.options.op === 'contains')
					return content.exports[condition.options.export_id].indexOf(condition.options.value) !== -1;

			} catch(e) {
				return false;
			}

			return false;
		})
		.then(function(bool) {
			return bool ? !condition.invert : condition.invert;
		});

	// default
	return false;
}


module.exports = Trigger;