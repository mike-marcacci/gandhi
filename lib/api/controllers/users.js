'use strict';

var Q = require('q');
var _ = require('lodash');
var r = require('rethinkdb');
var jwt = require('jsonwebtoken');
var controller = require('../controller.js');

function prepare(record) {
	if(Array.isArray(record)) return record.map(prepare);
	return _.omit(record, ['password','recovery_token']);
}

module.exports = function(config, resources) {
	return {
		list: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// parse the query
				var query = controller.parseQuery(req.query);

				resources.collections.User.query(
					conn,
					query,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user ? {id: req.user.id} : false
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(users){

					// set pagination headers
					return res.set(controller.makePageHeaders(
						query.skip,
						query.limit,
						users.total,
						req.path,
						req.query
					))

					// send the results
					.send(prepare(users));
				})
				.catch(function(err){
					return next(err);
				})
				.done();
			});
		},

		get: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.User.get(
					conn,
					req.params.user,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user ? {id: req.user.id} : false
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(user){
					res.send(prepare(user));
				})
				.catch(function(err){
					return next(err);
				})
				.done();
			});
		},

		put: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.User.save(
					conn,
					req.params.user,
					req.body,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user ? {id: req.user.id} : false
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(user){
					res.send(prepare(user));
				})
				.catch(function(err){
					return next(err);
				})
				.done();
			});
		},

		patch: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.User.update(
					conn,
					req.params.user,
					req.body,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user ? {id: req.user.id} : false
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(user){
					res.send(prepare(user));
				})
				.catch(function(err){
					return next(err);
				})
				.done();
			});
		},

		post: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// get the user, if set
				return Q.Promise(function(resolve, reject, notify){

					if(typeof req.headers.authorization !== 'string' || !req.headers.authorization.length)
						return resolve(null);

					jwt.verify(req.headers.authorization.slice(7, req.headers.authorization.length), config.auth.secret, function(err, decoded){
						if(err) return reject(err);

						if(!decoded.sub)
							return reject({code: 401, message: 'No subject encoded in token.'});

						// get user from the DB
						return resolve(r.table('users').get(decoded.sub).run(conn));

					});
				})
				.then(function(user){
					return resources.collections.User.create(
						conn,
						req.body,
						user && user.admin  ? true : user
					);
				})
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(user){
					res.status(201).send(prepare(user));
				})
				.catch(function(err){
					return next(err);
				})
				.done();
			});
		},

		delete: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.User.delete(
					conn,
					req.params.user,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user ? {id: req.user.id} : false
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(user){
					res.send(prepare(user));
				})
				.catch(function(err){
					return next(err);
				})
				.done();
			});
		},

	};
};
