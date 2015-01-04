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
    var allPermissions = r.literal(cycle('roles').coerceTo('array').map(function(roleKV){
      return [roleKV.nth(0), true];
    }).coerceTo('object'));

    return cycle.merge({
      assignments: cycle('users').default(cycle('assignments')),
      stages: cycle('flow').default(cycle('stages')).without({
        next: true
      }).merge({
        order: 0
      }),
      exports: cycle('exports').default({}),
      open: ['open'],
      close: ['close'],
      triggers: r.literal(cycle('events').coerceTo('array').map(function(eventKV){
        return [eventKV.nth(0), eventKV.nth(1).without('messages')];
      }).coerceTo('object').default(cycle('triggers'))),
      permissions: {
        create: allPermissions,
        read: allPermissions,
        update: allPermissions,
        destroy: {}
      },
      created: cycle('created').toEpochTime(),
      updated: cycle('updated').toEpochTime()
    }).without({
      users: true,
      flow: true,
      events: true
    });
  }).run(conn));


  // Projects
  // --------
  tasks.push(r.table('projects').replace(function(project){
    return project.merge({
      assignments: project('users').default(project('assignments')),
      contents: project('flow').default(project('contents')),
      created: project('created').toEpochTime(),
      updated: project('updated').toEpochTime()
    }).without({
      users: true,
      flow: true
    });
  }).run(conn));


  // Users
  // -----
  tasks.push(r.table('users').replace(function(user){
    return user.merge({
      created: user('created').toEpochTime(),
      updated: user('updated').toEpochTime()
    });
  }).run(conn));


  // Files
  // -----
  tasks.push(r.table('files').replace(function(file){
    return file.merge({
      created: file('created').toEpochTime(),
      updated: file('updated').toEpochTime()
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