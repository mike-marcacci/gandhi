var r = require('rethinkdb');
var _ = require('lodash');
var passport = require('passport');

module.exports = function(config, app, resources){

	app.namespace('/programs', passport.authenticate('bearer', { session: false }), function(){

		app.post('/', function(req, res){

			// restrict endpoint access to admin users
			if(!req.user.admin)
				return res.error(403);


			// TODO: validate against schema


			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				// insert program into the DB
				r.table('programs').insert(req.body, {returnVals: true}).run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					return res.data(203, result.new_val);
				});
			});
		});

		app.get('/', function(req, res){
			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				// get programs from the DB
				r.table('programs').orderBy('created').run(conn, function(err, cursor){
					if(err) {
						resources.db.release(conn);
						return res.error(err);
					}

					// output as an array
					cursor.toArray(function(err, programs){
						resources.db.release(conn);

						if(err)
							return res.error(err);

						return res.data(programs);
					});

				});
			});
		});

		app.get('/:program', function(req, res){
			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				// get programs from the DB
				r.table('programs').get(req.params.program).run(conn, function(err, program){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					if(!program)
						return res.error(400);

					return res.data(program);
				});
			});
		});

		app.patch('/:program', function(req, res){
			var removeUsers = [];

			// restrict endpoint access to admin users
			if(!req.user.admin)
				return res.error(403);


			// TODO: validate against schema


			var query = r.table('programs').get(req.params.program);

			// remove any users with a falsy value
			if(req.body.users){
				_.each(req.body.users, function(data, id){
					if(!data)
						removeUsers.push(id);
				});

				if(removeUsers.length)
					query = query.replace(r.row.merge(req.body).without({users: removeUsers}), {returnVals: true});
				else
					query = query.update(req.body, {returnVals: true});
			}


			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				// update program in the DB
				query.run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					return res.data(203, result.new_val);
				});
			});
		});
	});
};

