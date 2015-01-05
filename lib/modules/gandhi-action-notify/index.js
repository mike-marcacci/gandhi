'use strict';

var fs = require('fs');
var Q = require('q');
var handlebars = require('handlebars');

// handlebars.compile(fs.readFileSync(__dirname + '/template.html').toString('utf8'));

module.exports = function(router, resources){
	resources.actions.notify = function(options, project, cycle) {

		// TODO: create notifications

	}
}
