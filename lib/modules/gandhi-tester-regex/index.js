'use strict';

var pointer = require('json-pointer');

module.exports = function(router, resources){
	resources.testers.regex = function(options, project){
		try {
			var data = pointer.get(project, options.pointer);
			var res = typeof data === 'string' ? data.match(new RegExp(options.regex)) : false;
			return options.invert ? !res : !!res;
		} catch(e){
			return !!options.invert;
		}
	}
}
