'use strict';

var pointer = require('json-pointer');

module.exports = function(router, resources){
	resources.testers.date = function(options, project){
		var res = new Date() > new Date(options.date);
		return options.mode === 'before' ? !res : !!res;
	}
}
