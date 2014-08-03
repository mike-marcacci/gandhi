
module.exports = function(config, resources) {
	function processEvents(project, cycle, callback) {
		// apply event & states states to project

		// TODO: fire off listeners

		// calculate locks
	}

	function readFlow(project, cycle, user, callback) {
		// determine role

		// each flow
			// get component
			// call component.read


	}

	function updateFlow(data, project, cycle, user, callback) {
		// determine role

		// each flow
			// get component
			// call component.update

	}

	return {
		create: function(req, res) {
			res.status(200).send();
		},
		list: function(req, res) {
			res.status(200).send();
		},
		show: function(req, res) {
			if(!req.user)
				return res.error(401);

			// get the project & cycle
			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				// get cycles from the DB
				var query = r.table('projects').get(req.params.project);
				r.expr({
					project: query,
					cycle: r.table('cycles').get(query('cycle_id'))
				}).run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					var project = result.project;
					var cycle = result.cycle;

					if(!project || !cycle)
						return res.error(404);

					processEvents(project, cycle);

					return res.send(cycle);
				});
			});

		},
		update: function(req, res) {
			res.status(200).send();
		},
		replace: function(req, res) {
			res.status(200).send();
		},
		destroy: function(req, res) {
			res.status(200).send();
		}
	};
}
