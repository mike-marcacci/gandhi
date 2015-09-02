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
			triggers: cycle('triggers').coerceTo('array').map(function(triggerKV){
				return [triggerKV.nth(0), triggerKV.nth(1).merge({
					actions: triggerKV.nth(1)('actions').default(triggerKV.nth(1)('listeners')),
				}).without('listeners')];
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