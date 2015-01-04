'use strict';

var fs = require('fs');
var handlebars = require('handlebars');

module.exports = function(router, resources){
	resources.emailTemplates.notification = handlebars.compile(fs.readFileSync(__dirname + '/template.html').toString('utf8'));
}
