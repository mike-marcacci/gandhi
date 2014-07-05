'use strict';

var fs = require('fs');
var url = require('url');
var li = require('li');
var _ = require('lodash');
var r = require('rethinkdb');
var passport = require('passport');
var scrypt = require('scrypt');
	scrypt.hash.config.keyEncoding = scrypt.verify.config.keyEncoding = 'utf8';
	scrypt.hash.config.outputEncoding = scrypt.verify.config.outputEncoding = 'base64';

module.exports = function(config, app, resources){

	function create(req, res){

		// validate request against schema
		var err = resources.validator.validate('user', req.body, {useDefault: true});
		if(err)
			return res.error({code: 400, message: err});

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

						// sanatize sensitive fields
						delete user.password;

						return res.send(201, user);
					});
				});
			});
		})(req, res);
	}

	function list(req, res){
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
						users = users.map(function(user){
							delete user.password;
							return user;
						});

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

			// check for users assigned to a particular cycle
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

					// add all valid user IDs to the object
					var ids = [];
					Object.keys(cycle.users).forEach(function(id){
						if(cycle.users[id])
							ids.push(id);
					});

					return getUsers(ids);
				});
			}

			// check for users assigned to a particular project
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

					// add all valid user IDs to the object
					var ids = [];
					Object.keys(project.users).forEach(function(id){
						if(project.users[id])
							ids.push(id);
					});

					return getUsers(ids);
				});
			}

			return getUsers(null, parseInt(req.query.per_page, 10) || 50, parseInt(req.query.page, 10) || 1);
		});
	}

	function show(req, res){
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

				// sanatize sensitive fields
				delete user.password;

				return res.send(user);
			});
		});
	}

	function update(req, res){
		// can't just make yourself an admin
		if(!req.user.admin)
			delete req.body.admin;

		// add timestamps
		req.body.updated = r.now();

		// encrypt the password
		if(req.body.password)
			req.body.password = scrypt.hash(req.body.password, scrypt.params(0.1));


		// TODO: validate against schema


		resources.db.acquire(function(err, conn) {
			if(err)
				return res.error(err);

			// verify email is not already taken by a different user
			r.table('users').filter({email: req.body.email || null}).limit(1).run(conn, function(err, cursor){
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

					// update the user
					r.table('users').get(req.params.user).update(req.body, {returnVals: true}).run(conn, function(err, result){
						resources.db.release(conn);

						if(err)
							return res.error(err);

						var user = result.new_val;

						// sanatize sensitive fields
						delete user.password;

						return res.send(200, user);
					});
				});
			});
		});
	}

	function remove(req, res){
		resources.db.acquire(function(err, conn) {
			if(err)
				return res.error(err);

			// get users from the DB
			r.table('users').get(req.params.user).delete({returnVals: true}).run(conn, function(err, result){
				resources.db.release(conn);

				if(err)
					return res.error(err);

				var user = result.old_val;

				// sanatize sensitive fields
				delete user.password;

				return res.send(user);
			});
		});
	}

	//////////////
	// Files
	//////////////
	app.get(config.root + '/api/users/:user/files/:file', function(req, res){

		// TODO: restrict access for non-admin users???

		var root = config.files.directory + '/' + req.params.user + '/';
		var file = root + '/' + req.params.file;

		if(!fs.existsSync(file))
			return res.error(404);

		return res.sendfile(file);
	});

	app.post(config.root + '/api/users/:user/files', function(req, res){

		// restrict access to self for non-admin users
		if(!req.user.admin && req.user.id != req.params.user)
			return res.error(403);

		var response = {};
		_.each(req.files, function(file){

			// make sure files directory exists
			if(!fs.existsSync(config.files.directory + '/'))
				fs.mkdirSync(config.files.directory + '/');

			// build the destination root
			var root = config.files.directory + '/' + req.params.user + '/';

			// name the file
			var filename = Date.now() + '-' + file.originalFilename;

			// make sure user files directory exists
			if(!fs.existsSync(root))
				fs.mkdirSync(root);

			// move the file to its destination
			fs.renameSync(file.path, root + filename);

			response[file.fieldName] = {
				path: '/users/' + req.params.user + '/files/' + encodeURIComponent(filename),
				filename: filename
			};
		});

		// TODO: record this in the DB along with the user, etc

		res.send(200, response);
	});

	//////////////
	// Users
	//////////////

	app.post(config.root + '/api/users', create);


	// authenticate
	app.use(config.root + '/api/users', passport.authenticate('bearer', { session: false }));


	app.get(config.root + '/api/users', function(req, res){

		// restrict endpoint to admin users
		if(!req.user)
			return res.error(403);

		return list(req, res);
	});

	app.get(config.root + '/api/users/:user', function(req, res){

		// TODO: only show whitelisted properties to non-admin, non-current users
		// restrict access to logged-in users
		if(!req.user)
			return res.error(403);

		return show(req, res);
	});

	app.patch(config.root + '/api/users/:user', function(req, res){

		// restrict access to self for non-admin users
		if(!req.user.admin && req.user.id != req.params.user)
			return res.error(403);

		return update(req, res);
	});

	app.delete(config.root + '/api/users/:user', function(req, res){

		// restrict access to self for non-admin users
		if(!req.user.admin && req.user.id != req.params.user)
			return res.error(403);

		return remove(req, res);
	});


	//////////////////////////////
	// Users by Cycle
	//////////////////////////////


	// authenticate
	app.use(config.root + '/api/cycles/:cycle/users', passport.authenticate('bearer', { session: false }));



	app.use(config.root + '/api/cycles/:cycle/users', function(req, res, next){

		// restrict endpoint access to admin users
		if(!req.user.admin)
			return res.error(403);
		return next();

	});

	// app.post(config.root + '/api/cycles/:cycle/users', function(req, res){
	// 	return create(req, res);
	// });

	app.get(config.root + '/api/cycles/:cycle/users', function(req, res){
		return list(req, res);
	});

	app.get(config.root + '/api/cycles/:cycle/users/:project', function(req, res){
		return show(req, res);
	});

	app.patch(config.root + '/api/cycles/:cycle/users/:project', function(req, res){
		return update(req, res);
	});

	app.delete(config.root + '/api/cycles/:cycle/users/:project', function(req, res){
		return remove(req, res);
	});


	//////////////////////////////
	// Users by Project
	//////////////////////////////


	// authenticate
	app.use(config.root + '/api/projects/:project/users', passport.authenticate('bearer', { session: false }));



	app.use(config.root + '/api/projects/:project/users', function(req, res, next){

		// restrict endpoint access to admin users
		if(!req.user.admin)
			return res.error(403);
		return next();

	});

	// app.post(config.root + '/api/projects/:project/users', function(req, res){
	// 	return create(req, res);
	// });

	app.get(config.root + '/api/projects/:project/users', function(req, res){
		return list(req, res);
	});

	app.get(config.root + '/api/projects/:project/users/:user', function(req, res){
		return show(req, res);
	});

	app.patch(config.root + '/api/projects/:project/users/:user', function(req, res){
		return update(req, res);
	});

	app.delete(config.root + '/api/projects/:project/users/:user', function(req, res){
		return remove(req, res);
	});
};
