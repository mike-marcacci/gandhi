'use strict';

var r = require('rethinkdb');
var q = require('q');

var host = '127.0.0.1';
var db = 'gandhi';

// grab command line agrs
for (var i = 2; i < process.argv.length; i++) {
	if(process.argv[i] === '--host'){
		i++; host = process.argv[i];
	}

	else if(process.argv[i] === '--db'){
		i++; db = process.argv[i];
	}
}


r.connect({host: host, db: db}).then(function(conn){

	var tasks = [];

	// Notifications
	// -------------

	tasks.push(r.branch(r.tableList().contains('notifications'), null, r.tableCreate('notifications')).run(conn));


	// Cycles
	// ------
	tasks.push(r.table('cycles').replace(function(cycle){
		var allPermissions = cycle('roles').coerceTo('array').map(function(roleKV){
			return [roleKV.nth(0), true];
		}).coerceTo('object');

		return cycle.merge({
			defaults: {
				role_id: cycle('defaults')('role').default(cycle('defaults')('role_id')),
				status_id: cycle('defaults')('status').default(cycle('defaults')('status_id'))
			},
			assignments: cycle('users').coerceTo('array').map(function(userKV){
				return [userKV.nth(0), userKV.nth(1).do(function(user){
					return user.merge({role_id: user('role')});
				}).without({
					role: true
				})];
			}).coerceTo('object').default(cycle('assignments')),
			stages: cycle('flow').coerceTo('array').map(function(flowKV){
				return [flowKV.nth(0), flowKV.nth(1).merge({ order: 0 }).without({
					next: true
				})];
			}).coerceTo('object').default(cycle('stages')),
			exports: cycle('exports').default({}),
			open: ['open'],
			close: ['close'],
			triggers: cycle('events').coerceTo('array').map(function(eventKV){
				return [eventKV.nth(0), eventKV.nth(1).without({
					messages: true
				})];
			}).coerceTo('object').default(cycle('triggers')),
			permissions: {
				'project:read': cycle('permissions')('project:read').default(allPermissions),
				'project:create': cycle('permissions')('project:create').default(allPermissions),
				'project:update': cycle('permissions')('project:update').default(allPermissions),
				'project:delete': cycle('permissions')('project:delete').default({}),
				'project/assignments:read': cycle('permissions')('project/assignments:read').default(allPermissions),
				'project/assignments:write': cycle('permissions')('project/assignments:write').default(allPermissions),
				'project/contents:read': cycle('permissions')('project/contents:read').default(allPermissions),
				'project/contents:write': cycle('permissions')('project/contents:write').default(allPermissions)
			},
			created: r.branch(cycle('created').default(new Date().toISOString()).typeOf().eq('STRING'),
				r.ISO8601(cycle('created').default(new Date().toISOString())).toEpochTime(),
				r.branch(cycle('created').typeOf().eq('NUMBER'),
					cycle('created'),
					cycle('created').toEpochTime()
				)
			),
			updated: r.branch(cycle('updated').default(new Date().toISOString()).typeOf().eq('STRING'),
				r.ISO8601(cycle('updated').default(new Date().toISOString())).toEpochTime(),
				r.branch(cycle('updated').typeOf().eq('NUMBER'),
					cycle('updated'),
					cycle('updated').toEpochTime()
				)
			),
			status_id: r.branch(
				cycle('status').default(null).typeOf().eq('OBJECT'),
				cycle('status')('id').default('active'),
				cycle('status_id').default('active')
			),
			options: {
				open: cycle('options')('open').default(null),
				close: cycle('options')('close').default(null)
			}
		}).without([
			'users',
			'flow',
			'events',
			'status',
			'config',
			'open',
			'close'
		]).without({
			defaults: ['role','status', 'flow']
		});
	}).run(conn));


	// Projects
	// --------
	tasks.push(r.table('projects').replace(function(project){
		return project.merge({
			assignments: project('users').coerceTo('array').map(function(userKV){
				return [userKV.nth(0), userKV.nth(1).do(function(user){
					return user.merge({role_id: user('role')});
				}).without({
					role: true
				})];
			}).coerceTo('object').default(project('assignments')),
			contents: project('flow').coerceTo('array').map(function(flowKV){
				return [flowKV.nth(0), flowKV.nth(1).do(function(flow){
					return flow.merge({status_id: flow('status')});
				}).without({
					status: true
				})];
			}).coerceTo('object').default(project('contents').default({})),
			events: r.literal(project('events').default({}).coerceTo('array').map(function(eventKV){
				return [eventKV.nth(0), eventKV.nth(1).merge({
					timestamp: eventKV.nth(1)('date')
				}).without({
					date: true
				})];
			}).coerceTo('object')),
			created: r.branch(project('created').default(new Date().toISOString()).typeOf().eq('STRING'),
				r.ISO8601(project('created').default(new Date().toISOString())).toEpochTime(),
				r.branch(project('created').typeOf().eq('NUMBER'),
					project('created'),
					project('created').toEpochTime()
				)
			),
			updated: r.branch(project('updated').default(new Date().toISOString()).typeOf().eq('STRING'),
				r.ISO8601(project('updated').default(new Date().toISOString())).toEpochTime(),
				r.branch(project('updated').typeOf().eq('NUMBER'),
					project('updated'),
					project('updated').toEpochTime()
				)
			),
			status_id: r.branch(
				project('status').default(null).typeOf().eq('OBJECT'),
				project('status')('id').default('active'),
				project('status_id').default('active')
			),
		}).without([
			'users',
			'flow',
			'status'
		]);
	}).run(conn));


	// Users
	// -----
	tasks.push(r.table('users').replace(function(user){
		return user.merge({
			admin: user('admin').default(false),
			created: r.branch(user('created').typeOf().eq('STRING'),
				r.ISO8601(user('created')).toEpochTime(),
				r.branch(user('created').typeOf().eq('NUMBER'),
					user('created'),
					user('created').toEpochTime()
				)
			),
			updated: r.branch(user('updated').typeOf().eq('STRING'),
				r.ISO8601(user('updated')).toEpochTime(),
				r.branch(user('updated').typeOf().eq('NUMBER'),
					user('updated'),
					user('updated').toEpochTime()
				)
			)
		});
	}).run(conn));


	// Files
	// -----
	tasks.push(r.table('files').replace(function(file){
		return file.merge({
			created: r.branch(file('created').typeOf().eq('STRING'),
				r.ISO8601(file('created')).toEpochTime(),
				r.branch(file('created').typeOf().eq('NUMBER'),
					file('created'),
					file('created').toEpochTime()
				)
			),
			updated: r.branch(file('updated').typeOf().eq('STRING'),
				r.ISO8601(file('updated')).toEpochTime(),
				r.branch(file('updated').typeOf().eq('NUMBER'),
					file('updated'),
					file('updated').toEpochTime()
				)
			)
		});
	}).run(conn));

	// run all the tasks
	q.all(tasks).then(function(res){
		console.log('success:', JSON.stringify(res, null, 2));
		conn.close();
	}, function(err){
		console.error(err);
		conn.close();
	});
});