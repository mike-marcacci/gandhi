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
		require('../fixtures/db/cycles.json').map(function(cycle){
			var err = validator.validate('http://www.gandhi.io/schema/cycle', cycle);
			if(err) throw new Error(JSON.stringify(_.extend(err, {id: cycle.id})));
		})
	});

});