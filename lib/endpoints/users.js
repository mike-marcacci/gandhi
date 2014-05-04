var r = require('rethinkdb');
var passwords = require('../utils/passwords.js');

module.exports = function(config, app, resources){

	app.get('/users', function(req, res){
		resources.db.acquire(function(err, conn) {
			if(err)
				return res.error(err);

			// verify email is not already taken
			r.table('users').run(conn, function(err, cursor){
				if(err) {
					resources.db.release(conn);
					return res.error(err);
				}

				// output as an array
				cursor.toArray(function(err, users){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					return res.data(users);
				});
			});
		});
	});

	app.get('/users/:user', function(req, res){
		resources.db.acquire(function(err, conn) {
			if(err)
				return res.error(err);

			// get users from the DB
			r.table('users').get(req.params.user).run(conn, function(err, user){
				resources.db.release(conn);

				if(err)
					return res.error(err);

				if(!user)
					return res.error(400);

				return res.data(user);
			});
		});
	});

	app.post('/users', function(req, res){
		resources.db.acquire(function(err, conn) {
			if(err)
				return res.error(err);

			// TODO: validate against schema

			// get projects from the DB
			r.table('users').insert(req.body).run(conn, function(err, result){
				resources.db.release(conn);

				if(err)
					return res.error(err);

				return res.data(result.new_val);
			});
		});
	});

	app.post('/users/:user/files', function(req, res){
		var response = {};
		_.each(req.files, function(file){
			var data = fs.readFileSync(file.path);

			var path = __dirname + '/files/'+req.params.user;

			// make sure user files directory exists
			if(!fs.existsSync())
				fs.mkdirSync(path);

			// TODO: use file hash instead of timestamp???

			// name the file
			path = path + Date.now() + '-' + file.originalFilename;

			fs.writeFileSync(path);
			response[file.fieldName] = {
				path: path
			};
		});

		// TODO: record this in the DB along with the user, etc

		res.send(200, response);
	});

};
