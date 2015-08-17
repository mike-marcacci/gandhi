'use strict';

var _ = require('lodash');
var fs = require('fs');
var assert = require('chai').assert;
var uuid = require('../../lib/api/utils/uuid');

var validator = require('jjv')();


// customize validator
validator.addType('date', function (v) {
	return true;
	// return !isNaN(Date.parse(v));
});


// add schemas
fs.readdirSync(__dirname + '/../../lib/api/schemas/').forEach(function(file){
	if(file.indexOf('.json') !== (file.length - 5))
		return;

	var schema = require(__dirname + '/../../lib/api/schemas/' + file);
	validator.addSchema(schema);
});

describe('Schemas', function(){

	it('should create a valid default cycle', function(){
		var cycle = {
			id: uuid(),
			title: 'Test Cycle'
		};

		// apply defaults
		var err = validator.validate('http://www.gandhi.io/schema/cycle', cycle, {useDefault: true});
		if(err) throw new Error('APPLY DEFAULTS - ' + JSON.stringify(err.validation));

		// check validity of applied defaults
		err = validator.validate('http://www.gandhi.io/schema/cycle', cycle);
		if(err) throw new Error('INVALID DEFAULTS - ' + JSON.stringify(err.validation));
	});

	it('should create a valid default project', function(){
		var project = {
			id: uuid(),
			title: 'Test Project',
			cycle_id: '127cbea9-e03b-4b6e-8332-bb893fd26fd1'
		};

		// apply defaults
		var err = validator.validate('http://www.gandhi.io/schema/project', project, {useDefault: true});
		if(err) throw new Error('APPLY DEFAULTS - ' + JSON.stringify(err.validation));

		// check validity of applied defaults
		err = validator.validate('http://www.gandhi.io/schema/project', project);
		if(err) throw new Error('INVALID DEFAULTS - ' + JSON.stringify(err.validation));
	});

	it('should create a valid default user', function(){
		var user = {
			id: uuid(),
			email: 'test@example.com'
		};

		// apply defaults
		var err = validator.validate('http://www.gandhi.io/schema/user', user, {useDefault: true});
		if(err) throw new Error('APPLY DEFAULTS - ' + JSON.stringify(err.validation));

		// check validity of applied defaults
		err = validator.validate('http://www.gandhi.io/schema/user', user);
		if(err) throw new Error('INVALID DEFAULTS - ' + JSON.stringify(err.validation));
	});

	it('should create a valid default notification', function(){
		var notification = {
			id: uuid(),
			user_id: 'b8d2ddb0-d2e0-49ed-a559-cdca930ed48d',
			subject: 'Test',
			content: 'This is a test.'
		};

		// apply defaults
		var err = validator.validate('http://www.gandhi.io/schema/notification', notification, {useDefault: true});
		if(err) throw new Error('APPLY DEFAULTS - ' + JSON.stringify(err.validation));

		// check validity of applied defaults
		err = validator.validate('http://www.gandhi.io/schema/notification', notification);
		if(err) throw new Error('INVALID DEFAULTS - ' + JSON.stringify(err.validation));
	});

});