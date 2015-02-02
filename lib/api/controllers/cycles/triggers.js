'use strict';

var _ = require('lodash');

module.exports = function(config, resources) {
	return {
		list: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Trigger.query(
					conn,
					req.params.cycle,
					req.query,
					req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(triggers){
					res.send(_.values(triggers));
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		get: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Trigger.get(
					conn,
					req.params.cycle,
					req.params.trigger,
					req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(trigger){
					res.send(trigger);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		put: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Trigger.save(
					conn,
					req.params.cycle,
					req.params.trigger,
					req.body,
					req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(trigger){
					res.send(trigger);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		patch: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Trigger.update(
					conn,
					req.params.cycle,
					req.params.trigger,
					req.body,
					req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(trigger){
					res.send(trigger);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		post: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Trigger.create(
					conn,
					req.params.cycle,
					req.body,
					req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(trigger){
					res.send(trigger);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		delete: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Trigger.delete(
					conn,
					req.params.cycle,
					req.params.trigger,
					req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(trigger){
					res.send(trigger);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

	};
};
