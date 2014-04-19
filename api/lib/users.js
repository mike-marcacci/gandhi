var r = require('rethinkdb');

module.exports = function(config, app, resources){

	app.post('/users', function(req, res, next){
		res.send('ok');
	});

	app.get('/users', function(req, res, next){
		resources.db.acquire(function(err, connection) {
			if(err)
				return app.send(500, err);
					
			r.table('users').run(connection, function(err, cursor){
				if(err){
					resources.db.release(connection);
					return res.send(500, err);
				}

				// get the first record
				cursor.toArray(function(err, users){
					resources.db.release(connection);

					if(err)
						return res.send(500, err);

					return res.send(users);
				});
			});
		});
	});

	app.get('/user/:id?', function(req, res, next){
		resources.db.acquire(function(err, connection) {
			if(err)
				return app.send(500, err);

			// if no id is set, use the logged-in user id
			var id = req.params.id || req.user.id;

			// TODO: ACL

			// get the user by id
			r.table('users').get(id).run(connection, function(err, user){
				return res.send(200, user);
			});
		});
	});

	app.patch('/user/:id', function(req, res, next){
		resources.db.acquire(function(err, connection) {
			if(err)
				return app.send(500, err);

			// TODO: ACL

			// get the user by id
			r.table('users').get(req.params.id).update(req.body).run(connection, function(err, user){
				return res.send(200, user);
			});
		});
	});
};