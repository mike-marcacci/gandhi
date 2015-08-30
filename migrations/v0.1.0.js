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

	// Cycles
	// ------
	tasks.push(r.table('cycles').replace(function(cycle){
		return cycle.merge({
			permissions: {
				'project:read': cycle('permissions')('project:read').default({}),
				'project:create': cycle('permissions')('project:create').default({}),
				'project:update': cycle('permissions')('project:update').default({}),
				'project:delete': cycle('permissions')('project:delete').default({}),
				'project/assignments:read': cycle('permissions')('project/assignments:read').default({}),
				'project/assignments:write': cycle('permissions')('project/assignments:write').default({}),
				'project/contents:read': cycle('permissions')('project/contents:read').default({}),
				'project/contents:write': cycle('permissions')('project/contents:write').default({}),
				'project/invitations:read': cycle('permissions')('project/assignments:read').default({}),
				'project/invitations:write': cycle('permissions')('project/assignments:write').default({})
			},

			stages: cycle('stages').coerceTo('array').map(function(stagesKV){
				return [stagesKV.nth(0), stagesKV.nth(1).merge({
					visible: stagesKV.nth(1)('visible').default({}),
					order: stagesKV.nth(1)('order').default(0)
				})];
			}).coerceTo('object'),

			roles: cycle('roles').coerceTo('array').map(function(rolesKV){
				return [rolesKV.nth(0), rolesKV.nth(1).merge({
					visible: rolesKV.nth(1)('visible').default({}),
					assignable: rolesKV.nth(1)('assignable').default({})
				})];
			}).coerceTo('object'),
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