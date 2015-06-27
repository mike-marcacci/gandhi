'use strict';

var prefix = 'gandhi:tasks:';

module.exports = function(config, resources) {





	// TODO: 
	// - get a list of tasks `GET prefix:*`
	// - watch redis for key expiration
	// - perform method on collection with args






	return {
		set: function set(key, collection, method, args){
			return resources.redis.set(prefix + key, {
				collection: collection,
				method: method,
				args: args
			});
		},
		unset: function unset(key){
			resources.redis.del(prefix + key);
		}
	}
};