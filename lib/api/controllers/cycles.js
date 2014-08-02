
module.exports = function(config, resources) {
	return {
		create: function(req, res) {
			// validate request against schema
			var err = resources.validator.validate('cycle', req.body, {useDefault: true});
			if(err)
				return res.error({code: 400, message: err});

			var privilige = true;

			// only allow admins to create a new admin cycle
			if (req.body.admin && (err || !cycle || !cycle.admin))
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
				r.table('cycles').filter({email: req.body.email}).limit(1).count().run(conn, function(err, count){
					if(err) {
						resources.db.release(conn);
						return res.error(err);
					}

					if(count){
						resources.db.release(conn);
						return res.error(409, 'An account already exists with this email');
					}

					// insert the cycle
					r.table('cycles').insert(req.body, {returnVals: true}).run(conn, function(err, result){
						resources.db.release(conn);

						if(err)
							return res.error(err);

						var cycle = result.new_val;

						return res.send(201, sanitize(cycle, privilige));
					});
				});
			});
		},
		list: function(req, res) {

		},
		show: function(req, res) {

		},
		update: function(req, res) {

		},
		destroy: function(req, res) {

		}
	};
}
