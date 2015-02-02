'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var Q = require('q');
var cycleModel = require('../../models/cycles.js');

function sanitize(o) {
	delete o.href;
	return o;
}

module.exports = function(config, resources) {
	return {
		list: function(req, res, next){
			if(!req.user) return next(401);
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// get the cycle
				r.table('cycles').get(req.params.cycle).do(function(cycle){
					return r.branch(
						cycle.not(),
						r.error('{"code": 404, "message": "Cycle not found"}'),

						// return the models necessary for a component
						{
							cycle: cycleModel.sanitize(r.expr({id: req.user.id, admin: req.user.admin}), cycle),
							stages: cycle('stages').default([])
						}
					);
				})
				.run(conn)

				// pass to the components
				.then(function(result){
					return Q.all(_.map(_.sortBy(result.stages, 'order'), function(stage) {

						// if the component isn't registered server side
						if(!resources.components[stage.component.name])
							return stage;

						// pass to the component
						return resources.components[stage.component.name].stage.get(
							stage,
							result.cycle
						);
					}));
				})
				.then(function(stages){
					return res.send(stages);
				})
				.catch(function(err){
					try { err = JSON.parse(err.msg); } catch(e){}
					return next(err);
				})
				.finally(function(){
					resources.db.release(conn);
				});
			});
		},
		get: function(req, res, next){
			if(!req.user) return next(401);
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// get the cycle
				r.table('cycles').get(req.params.cycle).do(function(cycle){
					return r.branch(
						cycle.not(),
						r.error('{"code": 404, "message": "Cycle not found"}'),

						// get the stage
						cycle('stages')(req.params.stage).default(false).do(function(stage){
							return r.branch(
								stage.not(),
								r.error('{"code": 404, "message": "Stage not found"}'),

								// return the models necessary for a component
								{
									cycle: cycleModel.sanitize(r.expr({id: req.user.id, admin: req.user.admin}), cycle),
									stage: stage
								}
							);
						})
					);
				})
				.run(conn)

				// pass to the component
				.then(function(result){

					// if the component isn't registered server side
					if(!resources.components[result.stage.component.name])
						return result.stage;

					// pass to the component
					return resources.components[result.stage.component.name].stage.get(
						result.stage,
						result.cycle
					);
				})
				.then(function(stage){
					return res.send(stage);
				})
				.catch(function(err){
					try { err = JSON.parse(err.msg); } catch(e){}
					return next(err);
				})
				.finally(function(){
					resources.db.release(conn);
				});
			});
		},
		put: function(req, res, next){
			if(!req.user) return next(401);
			if(!req.user.admin) return next(403);

			// validate id
			if(req.params.stage !== req.body.id) return next({code: 400, message: 'The request body\'s id did not match the URL param.'});

			// sanitize request
			sanitize(req.body);

			// validate request against schema
			var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/stage', req.body, {useDefault: true});
			if(err) return next({code: 400, message: err});

			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// get the cycle
				r.table('cycles').get(req.params.cycle).do(function(cycle){
					return r.branch(
						cycle.not(),
						r.error('{"code": 404, "message": "Cycle not found"}'),

						// return the models necessary for a component
						{
							cycle: cycleModel.sanitize(r.expr({id: req.user.id, admin: req.user.admin}), cycle),
							stage: cycle('stages')(req.params.stage).default(null)
						}
					);
				})
				.run(conn)

				// pass to the component
				.then(function(result){

					// if the component isn't registered server side
					if(!resources.components[result.stage ? result.stage.component.name : req.body.component.name])
						return req.body;

					// pass to the component
					return resources.components[result.stage ? result.stage.component.name : req.body.component.name].stage.put(
						req.body,
						result.stage,
						result.cycle
					);
				})

				// update the content
				.then(function(stage){

					// validate the component's response
					var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/stage', stage, {useDefault: true});
					if(err) return Q.reject({code: 500, message: err});

					// build the update
					var update = {stages: {}}; update.stages[req.params.stage] = stage;

					return r.table('cycles')
					.get(req.params.cycle)
					.update(update, {returnChanges: true})
					('changes').nth(0)('new_val')('stages')(req.params.stage)
					.run(conn);
				})

				// TODO: run back through component

				.then(function(stage){
					return res.send(stage);
				})
				.catch(function(err){
					try { err = JSON.parse(err.msg); } catch(e){}
					return next(err);
				})
				.finally(function(){
					resources.db.release(conn);
				});
			});
		},
		patch: function(req, res, next){
			if(!req.user) return next(401);
			if(!req.user.admin) return next(403);

			// validate id
			if(typeof req.body.id !== 'undefined' && req.params.stage !== req.body.id) return next({code: 400, message: 'The request body\'s id did not match the URL param.'});

			// sanitize request
			sanitize(req.body);

			// validate request against schema
			var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/stage', req.body, {checkRequired: false});
			if(err) return next({code: 400, message: err});

			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// get the cycle
				r.table('cycles').get(req.params.cycle).do(function(cycle){
					return r.branch(
						cycle.not(),
						r.error('{"code": 404, "message": "Cycle not found"}'),

						// get the stage
						r.branch(
							cycle('stages').hasFields(req.params.stage).not(),
							r.error('{"code": 404, "message": "Stage not found"}'),

							// return the models necessary for a component
							{
								cycle: cycleModel.sanitize(r.expr({id: req.user.id, admin: req.user.admin}), cycle),
								stage: cycle('stages')(req.params.stage)
							}
						)
					);
				})
				.run(conn)

				// pass to the component
				.then(function(result){

					// if the component isn't registered server side
					if(!resources.components[result.stage ? result.stage.component.name : req.body.component.name])
						return req.body;

					// pass to the component
					return resources.components[result.stage ? result.stage.component.name : req.body.component.name].stage.patch(
						req.body,
						result.stage,
						result.cycle
					);
				})

				// update the content
				.then(function(stage){

					// validate the component's response
					var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/stage', stage, {useDefault: true});
					if(err) return Q.reject({code: 500, message: err});

					// build the update
					var update = {stages: {}}; update.stages[req.params.stage] = stage;

					return r.table('cycles')
					.get(req.params.cycle)
					.update(update, {returnChanges: true})
					('changes').nth(0)('new_val')('stages')(req.params.stage)
					.run(conn);
				})

				// TODO: run back through component

				.then(function(stage){
					return res.send(stage);
				})
				.catch(function(err){
					try { err = JSON.parse(err.msg); } catch(e){}
					return next(err);
				})
				.finally(function(){
					resources.db.release(conn);
				});
			});
		},
		delete: function(req, res, next){
			if(!req.user) return next(401);
			if(!req.user.admin) return next(403);

			return resources.db.acquire(function(err, conn){
				if(err) return next(err);
				r.table('cycles')
				.get(req.params.cycle)
				.replace(r.row.without({stages: req.params.stage}), {returnChanges: true})
				.run(conn)
				.then(function(result){
					if(!result || !result.changes[0].old_val || !result.changes[0].old_val.stages[req.params.stage]) return next(404);
					return res.send(result.changes[0].old_val.stages[req.params.stage]);
				})
				.catch(function(err){
					return next(err);
				})
				.finally(function(){
					resources.db.release(conn);
				});
			});
		}
	};
};
