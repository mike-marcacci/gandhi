'use strict';

var Assignment = require('../../models/Cycle/Assignment');
var Cycles     = require('../../collections/Cycles');
var cycles     = new Cycles();



module.exports = function(config, resources) {
	return {
		query: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// TODO: build query from req.query
				var query = {};

				// get the cycle
				return cycles.get(
					conn,
					req.params.cycle,
					req.user && req.user.admin && req.query.admin === 'true' ? true : (req.user || false)
				)
				// query the assignments
				.then(function(cycle){
					return cycle.assignments.query(query);
				})
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(assignments){
					res.send(assignments);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		get: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// get the cycle
				return cycles.get(
					conn,
					req.params.cycle,
					req.user && req.user.admin && req.query.admin === 'true' ? true : (req.user || false)
				)
				// get the assignment
				.then(function(cycle){
					return cycle.assignments.get(req.params.assignment);
				})
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(assignment){
					res.send(assignment);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		save: function(req, res, next){

			// TODO: acquire lock
			
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// get the cycle
				return cycles.get(
					conn,
					req.params.cycle,
					req.user && req.user.admin && req.query.admin === 'true' ? true : (req.user || false)
				)
				.then(function(cycle){

					// create the new assignment
					return new Assignment(req.body, cycle)

					// save the assignment to the cycle
					.then(function(assignment){ return assignment.save(); })
					.then(function(assignment){

						// save the cycle
						return cycle.save(conn)

						// return the assignment
						.then(function(){ return assignment; });
					});
				})
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(assignment){
					res.send(assignment);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		create: function(req, res, next){
			return res.status(405).send();
		},

		update: function(req, res, next){

			// TODO: acquire lock
			
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// get the cycle
				return cycles.get(
					conn,
					req.params.cycle,
					req.user && req.user.admin && req.query.admin === 'true' ? true : (req.user || false)
				)
				.then(function(cycle){

					// get the assignment
					return cycle.assignments.get(req.params.assignment)
					.then(function(assignment) {

						// update the assignment to the cycle
						return assignment.update(req.body)

						// save the cycle
						.then(function(){ return cycle.save(conn); })

						// return the assignment
						.then(function(){ return assignment; });
					});
					
				})
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(assignment){
					res.send(assignment);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		delete: function(req, res, next){

			// TODO: acquire lock
			
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// get the cycle
				return cycles.get(
					conn,
					req.params.cycle,
					req.user && req.user.admin && req.query.admin === 'true' ? true : (req.user || false)
				)
				.then(function(cycle){

					// get the assignment
					return cycle.assignments.get(req.params.assignment)
					.then(function(assignment) {

						// delete the assignment from the cycle
						return assignment.delete()
						.then(function(assignment){

							// save the cycle
							return cycle.save(conn)

							// return the assignment
							.then(function(){ return assignment; });
						});
					});
					
				})
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(assignment){
					res.send(assignment);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

	};
};
