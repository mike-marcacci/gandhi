'use strict';

var url = require('url');
var li = require('li');
var qs = require('qs');
var _ = require('lodash');
var r = require('rethinkdb');
var op = require('objectpath');
var crypto = require('crypto');
var passport = require('passport');
var scrypt = require('scrypt');
	scrypt.hash.config.keyEncoding = scrypt.verify.config.keyEncoding = 'utf8';
	scrypt.hash.config.outputEncoding = scrypt.verify.config.outputEncoding = 'base64';

var blacklist = ['password','recovery_token'];
var whitelist = ['id', 'email', 'name', 'href', 'admin', 'created','updated'];

function prepare(o, p){
	if(_.isArray(o))
		return _.map(o, function(o){return prepare(o, p);});

	return _.assign(
		(p === true || p === o.id) ? _.omit(o, blacklist) : _.pick(o, whitelist),
		{href: '/api/users/' + o.id}
	);
}

function sanitize(o){
	delete o.href;
	delete o.id;
}

module.exports = function(config, resources) {
	return {
		create: function(req, res){
			var email = 'welcome';

			// generate random password if not set
			req.body.password = req.body.password || crypto.randomBytes(256).toString('base64');

			// validate request against schema
			var err = resources.validator.validate('user', req.body, {useDefault: true});
			if(err)
				return res.error({code: 400, message: err});

			var privilige = true;

			// sanitize the input
			sanitize(req.body);

			passport.authenticate('bearer', { session: false }, function(err, user) {

				// only allow admins to create a new admin user
				if (req.body.admin && (err || !user || !user.admin))
					return res.error({code: 403, message: 'You are not authorized to create admin accounts.'});

				// add timestamps
				req.body.created = req.body.updated = r.now();

				// encrypt the password
				req.body.password = scrypt.hash(req.body.password, scrypt.params(0.1));

				resources.db.acquire(function(err, conn) {
					if(err)
						return res.error(err);

					// make the email case insensitive
					req.body.email = req.body.email.toLowerCase();

					// insert the user
					r.branch(r.table('users').filter({email: req.body.email}).limit(1).count().eq(1),
						{'$$ERROR$$': {'code': 409, 'message': 'An account already exists with this email'}},
						r.table('users').insert(req.body, {returnChanges: true})
					).run(conn, function(err, result){
						resources.db.release(conn);

						if(err)
							return res.error(err);

						if(result['$$ERROR$$'])
							return res.error(result['$$ERROR$$']);

						var user = result.changes[0].new_val;

						return res.status(201).send(prepare(user, privilige));
					});
				});
			})(req, res);
		},
		list: function(req, res){
			if(!req.user)
				return res.error(401);

			var privilige = req.user.admin || req.user.id;

			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				function getUsers(ids){

					var per_page = parseInt(req.query.per_page, 10) || 50;
					var page = parseInt(req.query.page, 10) || 1;

					// if we aren't getting any results
					if(ids && ids.length === 0)
						return res.send([]);

					// get users from the DB
					var query = r.table('users');

					// restrict to ids
					if(ids)
						query = query.getAll.apply(query, ids);

					// filter
					if(req.query.filter)
						query = query.filter(_.transform(req.query.filter, function(base, value, path) {
							try { value = JSON.parse(value); } catch(e){}
							var o = op.parse(path), l = o.length - 1, cursor = base;
							for (var i in o) {
								cursor = cursor[o[i]] = i < l ? {} : value;
							}
							return base;
						}));

					// search
					if(req.query.search && req.query.search !== '')
						query = query.filter(
							r.row('email').downcase().match(req.query.search.toLowerCase())
							.or(r.row('name').downcase().match(req.query.search.toLowerCase()))
						);

					// sort
					if(typeof req.query.sort === 'string') {
						var pointer = r.row;
						op.parse(req.query.sort).forEach(function(key){
							pointer = pointer(key);
						});
						query = req.query.direction === 'desc' ? query.orderBy(r.desc(pointer)) : query.orderBy(pointer);
					}

					r.expr({
						// get the total results count
						total: query.count(),
						// get the results for this page
						users: query.skip(per_page * (page - 1)).limit(per_page).coerceTo('array')
					}).run(conn, function(err, results){
						resources.db.release(conn);

						if(err)
							return res.error(err);

						var users = results.users;
						var pages = {
							first: 1,
							last: Math.ceil(results.total / per_page)
						};

						if(page > 1)
							pages.prev = page - 1;

						if(page < pages.last)
							pages.next = page + 1;

						res.set('Pages', JSON.stringify(pages));
						res.set('Link', li.stringify(_.mapValues(pages, function(value){
							return req.path + '?' + qs.stringify(_.extend({}, req.query, {page: value, per_page: per_page}));
						})));
						res.send(prepare(users));
					});
				}

				// get users by cycle
				if(req.params.cycle){
					return r.table('cycles').get(req.params.cycle).run(conn, function(err, cycle){
						if(err){
							resources.db.release(conn);
							return res.error(err);
						}

						if(!cycle){
							resources.db.release(conn);
							return res.error(404);
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
								if(_.indexOf(cycle.roles[role].visible, data.role) !== -1)
									ids.push(id);
							});

							return getUsers(ids);
						}

						// empty array for this user
						return res.send([]);
					});
				}

				// get users by project
				if(req.params.project){
					return r.table('projects').get(req.params.project).run(conn, function(err, project){
						if(err){
							resources.db.release(conn);
							return res.error(err);
						}

						if(!project){
							resources.db.release(conn);
							return res.error(404);
						}

						return r.table('cycles').get(project.cycle_id).run(conn, function(err, cycle){
							if(err){
								resources.db.release(conn);
								return res.error(err);
							}

							if(!cycle){
								resources.db.release(conn);
								return res.error(404);
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
								(project.users[req.user.id] && (role = project.users[req.user.id].role) && cycle.roles[role]) // role on project
								|| (cycle.users[req.user.id] && (role = cycle.users[req.user.id].role) && cycle.roles[role]) // role on cycle
							){
								_.each(cycle.users, function(data, id){
									if(_.indexOf(cycle.roles[role].visible, data.role) !== -1)
										ids.push(id);
								});

								return getUsers(ids);
							}

							// empty array for this user
							return res.send([]);
						});
					});
				}

				return getUsers();
			});
		},
		show: function(req, res){
			if(!req.user)
				return res.error(401);

			var id;

			if(req.params.user) // get by ID
				id = req.params.user;
			else if(req.params.file) // get by file
				id = r.table('files').get(req.params.file)('user_id');
			else
				return res.error(400);

			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				// get users from the DB
				r.table('users').get(id).run(conn, function(err, user){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					if(!user)
						return res.error(404);

					var privilige = req.user.admin || req.user.id === user.id;

					return res.send(prepare(user, privilige));
				});
			});
		},
		update: function(req, res){
			if(!req.user)
				return res.error(401);

			if(!req.user.admin && req.user.id !== req.params.user)
				return res.error({code: 403, message: 'Non-admin users may only update themselves.'});

			if(!req.user.admin && req.body.admin)
				return res.error({code: 403, message: 'You are not authorized to give admin status.'});

			var privilige = true;

			// sanitize the input
			sanitize(req.body);

			// validate request against schema
			var err = resources.validator.validate('user', req.body, {checkRequired: false});
			if(err)
				return res.error({code: 400, message: err});

			// add timestamps
			req.body.updated = r.now();

			// encrypt the password
			if(req.body.password)
				req.body.password = scrypt.hash(req.body.password, scrypt.params(0.1));

			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

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
						return res.error(err);

					if(result['$$ERROR$$'])
						return res.error(result['$$ERROR$$']);

					var user = result.changes[0].new_val;

					return res.send(prepare(user, privilige));
				});

			});
		},
		replace: function(req, res){
			if(!req.user)
				return res.error(401);

			if(!req.user.admin)
				return res.error({code: 403, message: 'Only admins can replace a user record.'});

			var privilige = true;

			// sanitize the input
			sanitize(req.body);

			// validate request against schema
			var err = resources.validator.validate('user', req.body, {useDefault: true});
			if(err)
				return res.error({code: 400, message: err});

			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				// build the query
				var query = r.table('users').get(req.params.user).replace(function(row){

					// inject ID
					req.body.id = req.params.cycle;

					// add timestamps
					req.body.created = row('created');
					req.body.updated = r.now();

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
						return res.error(err);

					if(result['$$ERROR$$'])
						return res.error(result['$$ERROR$$']);

					var user = result.changes[0].new_val;

					return res.send(prepare(user, privilige));
				});
			});
		},
		destroy: function(req, res){

			if(!req.user || !req.user.admin)
				return res.error(403, 'Only administrators may delete a user.');

			if(req.user.id == req.params.user)
				return res.error(400, 'You cannot delete your own admin account.');

			var privilige = true;

			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				// get users from the DB
				r.table('users').get(req.params.user).delete({returnChanges: true}).run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					var user = result.changes[0].old_val;

					return res.send(prepare(user, privilige));
				});
			});
		}
	};
};
