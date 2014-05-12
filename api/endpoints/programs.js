var r = require('rethinkdb');

module.exports = function(config, app, resources){

	app.get('/programs', function(req, res){
		resources.db.acquire(function(err, conn) {
			if(err)
				return res.error(err);

			// get programs from the DB
			r.table('programs').run(conn, function(err, cursor){
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

	app.get('/programs/:program', function(req, res){
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

};

