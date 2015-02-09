'use strict';

var _ = require('lodash');
var Q = require('q');

module.exports = function(config, resources) {
	return {
		list: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// TODO: build query from req.query
				var query = {};

				resources.collections.File.query(
					conn,
					query,
					req.user && req.user.admin  ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(files){

					// TODO: apply pagination headers

					res.send(files);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		get: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.File.get(
					conn,
					req.params.file,
					req.user && req.user.admin  ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(file){
					res.send(file);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		put: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.File.save(
					conn,
					req.params.file,
					req.body,
					req.user && req.user.admin  ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(file){
					res.send(file);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		patch: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.File.update(
					conn,
					req.params.file,
					req.body,
					req.user && req.user.admin  ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(file){
					res.send(file);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		post: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.File.create(
					conn,
					req.body,
					req.user && req.user.admin  ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(file){

					// send the response
					res.status(201).send(file);

					// get the email address
					return Q.when(
						file.user_id == req.user.id
						? req.user.email
						: r.table('users').get(file.user_id)('email').run(conn)
					)

					// email file to the user
					.then(function(email){
						resources.mail({
							to: email,
							subject: file.subject,
							html: resources.emailTemplates.file({
								content: file.content
							})
						})
					});
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		delete: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.File.delete(
					conn,
					req.params.file,
					req.user && req.user.admin  ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(file){
					res.send(file);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

	};
};
