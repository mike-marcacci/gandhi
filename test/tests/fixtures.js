'use strict';

var _ = require('lodash');
var fs = require('fs');
var assert = require('chai').assert;

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

describe('Fixtures', function(){

	it('should have valid cycles', function(){
		require('../fixtures/db/cycles.json').forEach(function(cycle){
			var err = validator.validate('http://www.gandhi.io/schema/cycle', cycle);
			if(err) throw new Error(JSON.stringify(_.extend(err, {id: cycle.id})));
		})
	});

	it('should have valid projects', function(){
		require('../fixtures/db/projects.json').forEach(function(cycle){
			var err = validator.validate('http://www.gandhi.io/schema/project', cycle);
			if(err) throw new Error(JSON.stringify(_.extend(err, {id: cycle.id})));
		})
	});

	it('should have valid users', function(){
		require('../fixtures/db/users.json').forEach(function(cycle){
			var err = validator.validate('http://www.gandhi.io/schema/user', cycle);
			if(err) throw new Error(JSON.stringify(_.extend(err, {id: cycle.id})));
		})
	});

	it('should have valid notifications', function(){
		require('../fixtures/db/notifications.json').forEach(function(cycle){
			var err = validator.validate('http://www.gandhi.io/schema/notification', cycle);
			if(err) throw new Error(JSON.stringify(_.extend(err, {id: cycle.id})));
		})
	});

});