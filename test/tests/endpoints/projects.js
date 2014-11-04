'use strict';

require('../../init.js');

var li = require('li');
var r = require('rethinkdb');
var _ = require('lodash');
var jwt = require('jsonwebtoken');

var assert = require('chai').assert;
var request, fixtures;

var blacklist = ['password', 'recovery_token'];
var whitelist = ['id', 'email', 'name', 'href', 'admin', 'created','updated'];

before(function(){
	request = global.setup.api;
	fixtures = global.setup.fixtures.db.projects;
});

describe('Projects', function(){
	var adminToken, adminId,
	    userToken, userId,
	    unaffiliatedToken, unaffiliatedId,
	    ids = [];

	before(function(done){
		request
			.post('/api/tokens')
			.send({
				email: 'mike.marcacci@test.gandhi.io',
				password: 'mike1234'
			})
			.expect(201)
			.end(function(err, res){
				if(err) return done(err);
				assert.isString(res.body.token);
				adminToken = res.body.token;
				adminId = jwt.decode(adminToken).sub;
				done();
			});
	});

	before(function(done){
		request
			.post('/api/tokens')
			.send({
				email: 'tim.marcacci@test.gandhi.io',
				password: 'tim1234'
			})
			.expect(201)
			.end(function(err, res){
				if(err) return done(err);
				assert.isString(res.body.token);
				userToken = res.body.token;
				userId = jwt.decode(userToken).sub;
				done();
			});
	});

	before(function(done){
		request
			.post('/api/tokens')
			.send({
				email: 'mark.boerneke@test.gandhi.io',
				password: 'mark1234'
			})
			.expect(201)
			.end(function(err, res){
				if(err) return done(err);
				assert.isString(res.body.token);
				unaffiliatedToken = res.body.token;
				unaffiliatedId = jwt.decode(unaffiliatedToken).sub;
				done();
			});
	});

	describe('#create', function(){
		it('prevents anonymous creation', function(done){
			request
				.post('/api/projects')
				.send({
					title: 'Woops!'
				})
				.expect(401)
				.end(done);
		});
		it('applies defaults to a new project for non-admin users', function(done){
			request
				.post('/api/projects')
				.set('Authorization', 'Bearer ' + userToken)
				.send({
					title: 'CREATE - Minimal Project',
					cycle_id: '128f2348-99d4-40a1-b5ab-91d9019f272d'
				})
				.expect(201)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.title, 'CREATE - Minimal Project')
					assert.equal(res.body.cycle_id, '128f2348-99d4-40a1-b5ab-91d9019f272d')
					// assert.property(res.body.users, userId);
					// assert.equal(res.body.users[userId].role, 'applicant');
					assert.equal(res.body.status, 'active');
					ids.push(res.body.id);
					done();
				})
		})
	});

	describe('#list', function(){
		it('rejects an anonymous request', function(done){
			request
				.get('/api/projects')
				.expect(401)
				.end(function(err, res){
					if(err) return done(err);
					assert.isNotArray(res.body);
					done();
				});
		});
		it('returns an array at least', function(done){
			request
				.get('/api/files')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.isArray(res.body);
					done();
				});
		});
		it.skip('accepts per_page parameters', function(done){
			request
				.get('/api/projects?per_page=5')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.isArray(res.body);
					assert.lengthOf(res.body, 5);
					var links = li.parse(res.headers.link);
					assert.equal(links.next, '/api/projects?per_page=5&page=2');
					assert.equal(links.last, '/api/projects?per_page=5&page='+Math.ceil((fixtures.length + ids.length) / 5));
					done();
				});
		});
		it.skip('accepts page parameters', function(done){
			request
				.get('/api/projects?per_page=5&page=2')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.isArray(res.body);
					assert.lengthOf(res.body, 5);
					var links = li.parse(res.headers.link);
					assert.equal(links.first, '/api/projects?per_page=5&page=1');
					assert.equal(links.prev, '/api/projects?per_page=5&page=1');
					done();
				});
		});
	});

	describe('#get', function(){
		it('rejects an anonymous request', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009')
				.expect(401)
				.end(done);
		});
		it('returns 404 for nonexistant project', function(done){
			request
				.get('/api/projects/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.expect(404)
				.end(done);
		});
		it('shows a project to an unaffiliated admin user', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009')
				.set('Authorization', 'Bearer ' + adminToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, 'b37e83a5-d613-4d64-8873-fdcc8df0a009');
					done();
				});
		});
		it.skip('rejects a request from an unaffiliated non-admin user');
		it.skip('rejects a request from an affiliated non-admin user without permission');
		it('shows a project to an affiliated non-admin user with permission');
	});

	describe('#patch', function(){
		it('rejects an anonymous update', function(done){
			request
				.patch('/api/projects/' + ids[0])
				.send({title: 'Woops!'})
				.expect(401)
				.end(done);
		});
		it('rejects an update by an unaffiliated non-admin user', function(done){
			request
				.patch('/api/projects/' + ids[0])
				.set('Authorization', 'Bearer ' + unaffiliatedToken)
				.send({title: 'Woops!'})
				.expect(403)
				.end(done);
		});
		it('returns 404 for nonexistant project', function(done){
			request
				.patch('/api/projects/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({title: 'Woops!'})
				.expect(404)
				.end(done);
		});
		it('accepts an update by an unaffiliated admin user', function(done){
			request
				.patch('/api/projects/' + ids[0])
				.set('Authorization', 'Bearer ' + adminToken)
				.send({
					title: 'UPDATED (By Admin)',
					invitations: {
						'72d8153e-dc53-4fcc-98c8-febfc4f171ed': {
						  id: '72d8153e-dc53-4fcc-98c8-febfc4f171ed',
						  role: 'applicant',
						  name: 'Mark Boerneke',
						  email: 'mark.boerneke@test.gandhi.io'
						}
					}
				})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, ids[0]);
					done();
				});
		});
		// it('rejects an update with an invalid invitation', function(done){
		// 	request
		// 		.patch('/api/projects/' + ids[0])
		// 		.set('Authorization', 'Bearer ' + unaffiliatedToken)
		// 		.send({
		// 			title: 'Woops!',
		// 			users: {
		// 				'82b08fd0-b93d-4169-a0bf-b25823077adb': {
		// 					id: '82b08fd0-b93d-4169-a0bf-b25823077adb',
		// 					invitation_id: '0853609d-5c15-4843-ae91-c60b3c7cb0c8'
		// 				}
		// 			}
		// 		})
		// 		.expect(400)
		// 		.end(done);
		// });
		// it('accepts an update by an invited non-admin user', function(done){
		// 	request
		// 		.patch('/api/projects/' + ids[0])
		// 		.set('Authorization', 'Bearer ' + unaffiliatedToken)
		// 		.send({
		// 			title: 'UPDATED (By Invited User)',
		// 			users: {
		// 				'82b08fd0-b93d-4169-a0bf-b25823077adb': {
		// 					id: '82b08fd0-b93d-4169-a0bf-b25823077adb',
		// 					invitation_id: '72d8153e-dc53-4fcc-98c8-febfc4f171ed'
		// 				}
		// 			}
		// 		})
		// 		.expect(200)
		// 		.end(function(err, res){
		// 			if(err) return done(err);
		// 			assert.equal(res.body.id, ids[0]);
		// 			assert.property(res.body.users, unaffiliatedId);
		// 			assert.equal(res.body.users[unaffiliatedId].role, 'applicant');
		// 			done();
		// 		});
		// });
	});

	// describe('#replace', function(){
	// 	var project;
	// 	before(function(done){
	// 		request
	// 			.get('/api/projects/' + ids[0])
	// 			.set('Authorization', 'Bearer ' + adminToken)
	// 			.expect(200)
	// 			.end(function(err, res){
	// 				if(err) return done(err);
	// 				project = res.body;
	// 				done();
	// 			});
	// 	});

	// 	it('rejects an anonymous replace', function(done){
	// 		request
	// 			.put('/api/projects/' + ids[0])
	// 			.send({title: 'Woops!'})
	// 			.expect(401)
	// 			.end(done);
	// 	});
	// 	it('rejects a replace by a non-admin user', function(done){
	// 		request
	// 			.put('/api/projects/' + ids[0])
	// 			.set('Authorization', 'Bearer ' + userToken)
	// 			.send(_.extend({}, project, {
	// 				title: 'UPDATED'
	// 			}))
	// 			.expect(403)
	// 			.end(done);
	// 	});
	// 	it('accepts a replace by an unaffiliated admin user', function(done){
	// 		request
	// 			.put('/api/projects/' + ids[0])
	// 			.set('Authorization', 'Bearer ' + adminToken)
	// 			.send(_.extend({}, project, {
	// 				title: 'UPDATED'
	// 			}))
	// 			.expect(200)
	// 			.end(function(err, res){
	// 				if(err) return done(err);
	// 				assert.equal(res.body.id, ids[0]);
	// 				done();
	// 			});
	// 	});
	// });

	describe('#delete', function(){
		it('rejects an anonymous delete', function(done){
			request
				.delete('/api/projects/' + ids[0])
				.expect(401)
				.end(done);
		});
		it('rejects a delete by a non-admin user', function(done){
			request
				.delete('/api/projects/' + ids[0])
				.set('Authorization', 'Bearer ' + userToken)
				.expect(403)
				.end(done);
		});
		it('returns 404 for nonexistant project', function(done){
			request
				.delete('/api/projects/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.expect(404)
				.end(done);
		});
		it('deletes a project for an admin user', function(done){
			request
				.delete('/api/projects/' + ids[0])
				.set('Authorization', 'Bearer ' + adminToken)
				.expect(200)
				.end(done);
		});
	});

	// test embedded collections
	['assignments', 'invitations'].forEach(function(c){
		require('./projects/' + c);
	});

	// remove any projects we just created
	after(function(done){
		if(!ids.length)
			return done();

		r.connect(global.setup.config.db, function(err, conn){
			r.table('projects').getAll(ids).delete().run(conn, function(err, res){
				conn.close();
				done(err, res);
			});
		});
	});

});
