'use strict';

var _ = require('lodash');
var r = require('rethinkdb');

module.exports = function(config, resources) {
	return _.extend(require('../_embedded.js')('cycle', 'cycles', 'stage', 'stages', config, resources), {
		list: function(req, res, next){
			if(!req.user) return next(401);
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);
				r.table('cycles')
				.get(req.params.cycle)('stages')
				.default(false)
				.run(conn)
				.then(function(results){
					if(!results) return next(404);
					return res.send(_.sortBy(results, 'order'));
				})
				.catch(function(err){
					return next(err);
				})
				.finally(function(){
					resources.db.release(conn);
				});
			});
		}
	});
};
