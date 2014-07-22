'use strict';

var url = require('url');
var li = require('li');
var _ = require('lodash');
var r = require('rethinkdb');
var passport = require('passport');
var scrypt = require('scrypt');
	scrypt.hash.config.keyEncoding = scrypt.verify.config.keyEncoding = 'utf8';
	scrypt.hash.config.outputEncoding = scrypt.verify.config.outputEncoding = 'base64';

var blacklist = ['password','recovery_token'];
var whitelist = ['id', 'email', 'name', 'href', 'admin', 'created','updated'];

function sanitize(o, p){
	if(_.isArray(o))
		return _.map(o, function(o){return sanitize(o, p);});

	return _.assign(
		(p === true || p === o.id) ? _.omit(o, blacklist) : _.pick(o, whitelist),
		{href: '/api/users/' + o.id}
	);
}

module.exports = function(config, resources) {
	return {
		create: function(req, res){

			// validate request against schema
			var err = resources.validator.validate('user', req.body, {useDefault: true});
			if(err)
				return res.error({code: 400, message: err});

			var privilige = true;

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

					// verify email is not already taken
					r.table('users').filter({email: req.body.email}).limit(1).count().run(conn, function(err, count){
						if(err) {
							resources.db.release(conn);
							return res.error(err);
						}

						if(count){
							resources.db.release(conn);
							return res.error(409, 'An account already exists with this email');
						}

						// insert the user
						r.table('users').insert(req.body, {returnVals: true}).run(conn, function(err, result){
							resources.db.release(conn);

							if(err)
								return res.error(err);

							var user = result.new_val;

							return res.send(201, sanitize(user, privilige));
						});
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

				function getUsers(ids, per_page, page){

					function buildQuery(){
						// get users from the DB
						var query = r.table('users');

						// restrict to ids
						if(ids)
							query = query.getAll.apply(query, ids);

						// apply the filter
						if(req.query.filter)
							query = query.filter(req.query.filter);

						return query;
					}

					var query = buildQuery();

					// apply page
					if(per_page && page)
						query = query.skip(per_page * (page - 1));

					// apply per_page
					if(per_page)
						query = query.limit(per_page);

					query.orderBy('created').run(conn, function(err, cursor){
						if(err) {
							resources.db.release(conn);
							return res.error(err);
						}

						// output as an array
						cursor.toArray(function(err, users){
							resources.db.release(conn);

							if(err)
								return res.error(err);

							// remove password field
							users = sanitize(users, privilige);

							// if we aren't paginating
							if(!per_page)
								return res.send(users);

							// get total pages
							var query = buildQuery();

							// get the total
							query.count().run(conn, function(err, total){
								var links = {};
								var pages = Math.ceil(total / per_page);

								// if this is the only page
								if(pages === 1)
									return res.send(users);

								function buildLink(query){
									return url.format({
										// protocol: req.protocol,
										// host: req.host,
										pathname: req.path,
										query: _.extend({}, req.query, query),
									});
								}

								// build previous links
								if(page && page != 1){
									links.first = buildLink({page: 1, per_page: per_page});
									links.prev = buildLink({page: page-1, per_page: per_page});
								}

								// build next links
								if(!page || page < pages){
									links.next = buildLink({page: page+1, per_page: per_page});
									links.last = buildLink({page: pages, per_page: per_page});
								}

								res.set('Link', li.stringify(links));
								res.send(users);
							});
						});
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

				return getUsers(null, parseInt(req.query.per_page, 10) || 50, parseInt(req.query.page, 10) || 1);
			});
		},
		show: function(req, res){
			if(!req.user)
				return res.error(401);

			var privilige = req.user.admin || req.user.id;

			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				// get users from the DB
				r.table('users').get(req.params.user).run(conn, function(err, user){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					if(!user)
						return res.error(404);

					return res.send(sanitize(user, privilige));
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

				if(typeof req.body.email == 'undefined')
					return next();

				// verify email is not already taken by a different user
				return r.table('users').filter({email: req.body.email || null}).limit(1).run(conn, function(err, cursor){
					if(err) {
						resources.db.release(conn);
						return res.error(err);
					}

					cursor.toArray(function(err, existing){
						if(err) {
							resources.db.release(conn);
							return res.error(err);
						}

						if(existing && existing[0] && existing[0].id != req.params.user){
							resources.db.release(conn);
							return res.error(409, 'An account already exists with this email');
						}

						next();
					});
				});

				function next(){
					// update the user
					r.table('users').get(req.params.user).update(req.body, {returnVals: true}).run(conn, function(err, result){
						resources.db.release(conn);

						if(err)
							return res.error(err);

						var user = result.new_val;

						return res.send(200, sanitize(user, privilige));
					});
				}

			});
		},
		destroy: function(req, res){

			if(!req.user || !req.user.admin)
				return res.error(403, 'Only administrators may delete a user.');

			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				// get users from the DB
				r.table('users').get(req.params.user).delete({returnVals: true}).run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					var user = result.old_val;

					return res.send(sanitize(user));
				});
			});
		}
	};
};
