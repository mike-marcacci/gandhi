'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var crypto = require('crypto');
var passport = require('passport');
var scrypt = require('scrypt');
	scrypt.hash.config.keyEncoding = scrypt.verify.config.keyEncoding = 'utf8';
	scrypt.hash.config.outputEncoding = scrypt.verify.config.outputEncoding = 'base64';

var controller = require('../controller.js');

var blacklist = ['password','recovery_token'];
var whitelist = ['id', 'email', 'name', 'href', 'admin', 'created','updated'];

function prepare(o, p){
	if(_.isArray(o))
		return _.map(o, function(o){return prepare(o, p);});

	return _.assign(
		(p === true || p === o.id) ? _.omit(o, blacklist) : _.pick(o, whitelist),
		{href: 'api/users/' + o.id}
	);
}

function sanitize(o){
	delete o.href;
	delete o.id;
}

module.exports = function(config, resources) {
	return {
		post: function(req, res, next){

			// generate random password if not set
			req.body.password = req.body.password || crypto.randomBytes(256).toString('base64');

			// validate request against schema
			var err = resources.validator.validate('http://www.gandhi.io/schema/user', req.body, {useDefault: true});
			if(err)
				return next({code: 400, message: err});

			var privilige = true;

			// sanitize the input
			sanitize(req.body);

			passport.authenticate('bearer', { session: false }, function(err, user) {

				// only allow admins to create a new admin user
				if (req.body.admin && (err || !user || !user.admin))
					return next({code: 403, message: 'You are not authorized to create admin accounts.'});

				// add timestamps
				req.body.created = req.body.updated = r.now().toEpochTime();

				// encrypt the password
				req.body.password = scrypt.hash(req.body.password, scrypt.params(0.1));

				resources.db.acquire(function(err, conn) {
					if(err)
						return next(err);

					// make the email case insensitive
					req.body.email = req.body.email.toLowerCase();

					// insert the user
					r.branch(
						r.table('users').filter({email: req.body.email}).limit(1).count().eq(1),
						r.error('{"code": 409, "message": "An account already exists with this email"}'),
						r.table('users').insert(req.body, {returnChanges: true})
					)
					('changes').nth(0)('new_val')
					.run(conn)
					.then(function(user){
						return res.status(201).send(prepare(user, privilige));
					})
					.catch(function(err){
						try { err = JSON.parse(err.msg); } catch(e){}
						return next(err);
					})
					.finally(function(){
						resources.db.release(conn);
					});
				});
			})(req, res);
		},
		list: function(req, res, next){
			if(!req.user) return next(401);

			// shoule we apply pagination?
			var paginate = true;

			// restrict to project
			if(req.params.project || req.query.project){
				paginate = false;

				// TODO: restrict to roles

				var query = r.table('projects').get(req.params.project || req.query.project).do(function(project){
					return r.branch(
						project.eq(null),
						r.error('{"code": 404, "message": "Project does not exist"}'),
						project('assignments').coerceTo('array').map(function(assignmentArr){
							return assignmentArr.nth(0);
						}).do(function(ids){
							return r.branch(ids.count().eq(0), [], r.table('users').getAll(r.args(ids)));
						})
					)
				});
			}

			// restrict to cycle
			else if(req.params.cycle || req.query.cycle) {
				paginate = false;

				// TODO: restrict to roles

				var query = r.table('cycles').get(req.params.cycle || req.query.cycle).do(function(cycle){
					return r.branch(
						cycle.eq(null),
						r.error('{"code": 404, "message": "Cycle does not exist"}'),
						cycle('assignments').coerceTo('array').map(function(assignmentArr){
							return assignmentArr.nth(0);
						}).do(function(ids){
							return r.branch(ids.count().eq(0), [], r.table('users').getAll(r.args(ids)));
						})
					)
				});
			}

			else {
				var query = r.table('users');
			}

			// filter
			query = controller.filter(req, query);

			// search
			if(req.query.search && req.query.search !== '')
				query = query.filter(r.or(
					r.row('name').downcase().match(req.query.search.toLowerCase()),
					r.row('email').downcase().match(req.query.search.toLowerCase())
				));

			// sort
			query = controller.sort(req, query);

			resources.db.acquire(function(err, conn) {
				if(err) return next(err);

				if(paginate){
					var per_page = parseInt(req.query.per_page, 10) || 50;
					var page = parseInt(req.query.page, 10) || 1;

					var response = r.expr({
						// get the total results count
						total: query.count(),
						// get the results for this page
						users: query.skip(per_page * (page - 1)).limit(per_page).coerceTo('array')
					})
					.run(conn)
					.then(function(results){
						// set pagination headers
						controller.paginate(req, res, page, per_page, results.total);
						res.send(prepare(results.users));
					});
				} else {
					var response = query.run(conn).then(function(users){
						res.send(prepare(users));
					});
				}
				
				response.catch(function(err){
					try { err = JSON.parse(err.msg); } catch(e){}
					return next(err);
				})
				.finally(function(){
					resources.db.release(conn);
				});
			});





				// get users by cycle
				if(req.params.cycle){
					return r.table('cycles').get(req.params.cycle).run(conn, function(err, cycle){
						if(err){
							resources.db.release(conn);
							return next(err);
						}

						if(!cycle){
							resources.db.release(conn);
							return next(404);
						}

						var role, ids = [];

						// (admin) fetch all users
						if(req.user.admin){
							Object.keys(cycle.users).forEach(function(id){
								ids.push(id);
							});

							return getUsers(ids);
						}

						// (role) fetch all users visible to the current user's role on the cycle
						if(cycle.users[req.user.id] && (role = cycle.users[req.user.id].role) && cycle.roles[role]){
							_.each(cycle.users, function(data, id){
								if(cycle.roles[role].visible[data.role])
									ids.push(id);
							});

							return getUsers(ids);
						}

						// empty array for this user
						resources.db.release(conn);
						return res.send([]);
					});
				}

				// get users by project
				if(req.params.project){
					return r.table('projects').get(req.params.project).run(conn, function(err, project){
						if(err){
							resources.db.release(conn);
							return next(err);
						}

						if(!project){
							resources.db.release(conn);
							return next(404);
						}

						return r.table('cycles').get(project.cycle_id).run(conn, function(err, cycle){
							if(err){
								resources.db.release(conn);
								return next(err);
							}

							if(!cycle){
								resources.db.release(conn);
								return next(404);
							}

							var role, ids = [];

							// (admin) fetch all users
							if(req.user.admin){
								Object.keys(cycle.users).forEach(function(id){
										ids.push(id);
								});

								Object.keys(project.users).forEach(function(id){
										ids.push(id);
								});

								return getUsers(_.unique(ids));
							}

							// (role) fetch all users visible to the current user's role on the project or cycle
							if(
								(project.users[req.user.id] && (role = project.users[req.user.id].role) && cycle.roles[role]) || // role on project
								(cycle.users[req.user.id] && (role = cycle.users[req.user.id].role) && cycle.roles[role]) // role on cycle
							){
								_.each(cycle.users, function(data, id){
									if(cycle.roles[role].visible[data.role])
										ids.push(id);
								});

								return getUsers(ids);
							}

							// empty array for this user
							return res.send([]);
						});
					});
				}
		},
		get: function(req, res, next){
			if(!req.user)
				return next(401);

			var id;

			if(req.params.user) // get by ID
				id = req.params.user;
			else if(req.params.file) // get by file
				id = r.table('files').get(req.params.file)('user_id');
			else
				return next(400);

			resources.db.acquire(function(err, conn) {
				if(err)
					return next(err);

				// get users from the DB
				r.table('users').get(id).run(conn, function(err, user){
					resources.db.release(conn);

					if(err)
						return next(err);

					if(!user)
						return next(404);

					var privilige = req.user.admin || req.user.id === user.id;

					return res.send(prepare(user, privilige));
				});
			});
		},
		patch: function(req, res, next){
			if(!req.user)
				return next(401);

			if(!req.user.admin && req.user.id !== req.params.user)
				return next({code: 403, message: 'Non-admin users may only update themselves.'});

			if(!req.user.admin && req.body.admin)
				return next({code: 403, message: 'You are not authorized to give admin status.'});

			var privilige = true;

			// sanitize the input
			sanitize(req.body);

			// validate request against schema
			var err = resources.validator.validate('http://www.gandhi.io/schema/user', req.body, {checkRequired: false});
			if(err)
				return next({code: 400, message: err});

			// add timestamps
			req.body.updated = r.now().toEpochTime();

			// encrypt the password
			if(req.body.password)
				req.body.password = scrypt.hash(req.body.password, scrypt.params(0.1));

			resources.db.acquire(function(err, conn) {
				if(err)
					return next(err);

				// build the query
				var query = r.table('users').get(req.params.user).update(req.body, {returnChanges: true});

				// verify email is not already taken by a different user
				if(typeof req.body.email !== 'undefined')
					query = r.do(r.table('users').filter({email: req.body.email}).limit(1).nth(0).default(null), function(conflict){
						return r.branch(conflict.eq(null).not().and(conflict('id').eq(req.params.user).not()),
							{'$$ERROR$$': {'code': 409, 'message': 'An account already exists with this email'}},
							query
						);
					});

				// update the user
				query.run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return next(err);

					if(result['$$ERROR$$'])
						return next(result['$$ERROR$$']);

					var user = result.changes[0].new_val;

					return res.send(prepare(user, privilige));
				});

			});
		},
		put: function(req, res, next){
			if(!req.user)
				return next(401);

			if(!req.user.admin)
				return next({code: 403, message: 'Only admins can replace a user record.'});

			var privilige = true;

			// sanitize the input
			sanitize(req.body);

			// validate request against schema
			var err = resources.validator.validate('http://www.gandhi.io/schema/user', req.body, {useDefault: true});
			if(err)
				return next({code: 400, message: err});

			resources.db.acquire(function(err, conn) {
				if(err)
					return next(err);

				// build the query
				var query = r.table('users').get(req.params.user).replace(function(row){

					// inject ID
					req.body.id = req.params.user;

					// add timestamps
					req.body.created = row('created').default(r.now().toEpochTime());
					req.body.updated = r.now().toEpochTime();

					// encrypt the password or use old one
					req.body.password = req.body.password ? scrypt.hash(req.body.password, scrypt.params(0.1)) : row('password');

					return req.body;
				}, {returnChanges: true});

				// verify email is not already taken by a different user
				if(typeof req.body.email !== 'undefined')
					query = r.do(r.table('users').filter({email: req.body.email}).limit(1).nth(0).default(null), function(conflict){
						return r.branch(conflict.eq(null).not().and(conflict('id').eq(req.params.user).not()),
							{'$$ERROR$$': {'code': 409, 'message': 'An account already exists with this email'}},
							query
						);
					});

				// replace the user
				query.run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return next(err);

					if(result['$$ERROR$$'])
						return next(result['$$ERROR$$']);

					var user = result.changes[0].new_val;

					return res.send(prepare(user, privilige));
				});
			});
		},
		delete: function(req, res, next){

			if(!req.user || !req.user.admin)
				return next(403, 'Only administrators may delete a user.');

			if(req.user.id == req.params.user)
				return next(400, 'You cannot delete your own admin account.');

			var privilige = true;

			resources.db.acquire(function(err, conn) {
				if(err)
					return next(err);

				// get users from the DB
				r.table('users').get(req.params.user).delete({returnChanges: true}).run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return next(err);

					var user = result.changes[0].old_val;

					return res.send(prepare(user, privilige));
				});
			});
		}
	};
};
