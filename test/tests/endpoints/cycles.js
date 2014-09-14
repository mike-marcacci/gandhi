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
	fixtures = global.setup.fixtures.db.cycles;
});

describe('Cycles', function(){
	var adminToken, adminId, userToken, userId, ids = [];

	before(function(done){
		request
			.post('/api/tokens')
			.send({
				email: 'mike.marcacci@test.gandhi.io',
				password: 'mike1234'
			})
			.expect(201)
			.end(function(err, res){
				assert.isNull(err);
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
				assert.isNull(err);
				assert.isString(res.body.token);
				userToken = res.body.token;
				userId = jwt.decode(adminToken).sub;
				done();
			});
	});

	describe('#create', function(){
		it('prevents anonymous creation', function(done){
			request
				.post('/api/cycles')
				.send({
					title: 'Woops!'
				})
				.expect(401)
				.end(done);
		});
		it('prevents non-admin creation', function(done){
			request
				.post('/api/cycles')
				.set('Authorization', 'Bearer ' + userToken)
				.send({
					title: 'Woops!'
				})
				.expect(403)
				.end(done);
		});
		it('rejects a misformatted cycle', function(done){
			request
				.post('/api/cycles')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({
					cool: 'beans'
				})
				.expect(400)
				.end(function(err, res){
					assert.isNull(err);
					done();
				});
		});
		it('allows creation of minimal cycle', function(done){
			request
				.post('/api/cycles')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({
					title: 'Awesome Possum'
				})
				.expect(201)
				.end(function(err, res){
					assert.isNull(err);
					assert.isString(res.body.id);
					ids.push(res.body.id);
					assert.equal(res.body.title, 'Awesome Possum');
					done();
				});
		});
	});

	describe('#read', function(){
		describe('(list) /cycles', function(){
			it('rejects an anonymous request', function(done){
				request
					.get('/api/cycles')
					.expect(401)
					.end(function(err, res){
						assert.isNull(err);
						assert.isNotArray(res.body);
						done();
					});
			});
			it('shows all cycles to an admin user', function(done){
				request
					.get('/api/cycles')
					.set('Authorization', 'Bearer ' + adminToken)
					.expect(200)
					.end(function(err, res){
						assert.isNull(err);
						
						assert.isArray(res.body);
						// assert.lengthOf(res.body, fixtures.cycles.length);
						done();
					});
			});
			it.skip('hides draft cycles from a non-admin user', function(done){});
			it.skip('accepts per_page parameters', function(done){
				request
					.get('/api/cycles?per_page=5')
					.set('Authorization', 'Bearer ' + userToken)
					.expect(200)
					.end(function(err, res){
						assert.isNull(err);
						assert.isArray(res.body);
						assert.lengthOf(res.body, 5);
						var links = li.parse(res.headers.link);
						assert.equal(links.next, '/api/cycles?per_page=5&page=2');
						assert.equal(links.last, '/api/cycles?per_page=5&page='+Math.ceil((fixtures.length + ids.length) / 5));
						done();
					});
			});
			it.skip('accepts page parameters', function(done){
				request
					.get('/api/cycles?per_page=5&page=2')
					.set('Authorization', 'Bearer ' + userToken)
					.expect(200)
					.end(function(err, res){
						assert.isNull(err);
						assert.isArray(res.body);
						assert.lengthOf(res.body, 5);
						var links = li.parse(res.headers.link);
						assert.equal(links.first, '/api/cycles?per_page=5&page=1');
						assert.equal(links.prev, '/api/cycles?per_page=5&page=1');
						done();
					});
			});
		});

		describe('(show) /cycles/:id', function(){
			it('rejects an anonymous request', function(done){
				request
					.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d')
					.expect(401)
					.end(done);
			});
			it('shows a non-draft cycle to an admin user', function(done){
				request
					.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d')
					.set('Authorization', 'Bearer ' + adminToken)
					.expect(200)
					.end(function(err, res){
						assert.isNull(err);
						assert.equal(res.body.id, '128f2348-99d4-40a1-b5ab-91d9019f272d');
						done();
					});
			});
			it.skip('shows a draft cycle to an admin user', function(done){});
			it.skip('shows a non-draft cycle to a non-admin user', function(done){});
			it.skip('hides a draft cycle from a non-admin user', function(done){});
		});
	});

	describe('#update', function(){
		it('rejects an anonymous update', function(done){
			request
				.patch('/api/cycles/' + ids[0])
				.send({title: 'Woops!'})
				.expect(401)
				.end(done);
		});
		it('rejects an update by a non-admin user', function(done){
			request
				.patch('/api/cycles/' + ids[0])
				.set('Authorization', 'Bearer ' + userToken)
				.send({title: 'Woops!'})
				.expect(403)
				.end(done);
		});
		it('updates a cycle', function(done){
			request
				.patch('/api/cycles/' + ids[0])
				.set('Authorization', 'Bearer ' + adminToken)
				.send({
					title: 'UPDATED'
				})
				.expect(200)
				.end(function(err, res){
					assert.isNull(err);
					assert.equal(res.body.id, ids[0]);
					done();
				});
		});
	});

	describe('#replace', function(){
		it('rejects an anonymous replace', function(done){
			request
				.put('/api/cycles/' + ids[0])
				.send({title: 'Woops!'})
				.expect(401)
				.end(done);
		});
		it('rejects a replace by a non-admin user', function(done){
			request
				.put('/api/cycles/' + ids[0])
				.set('Authorization', 'Bearer ' + userToken)
				.send({title: 'Woops!'})
				.expect(403)
				.end(done);
		});
		it('replaces a cycle', function(done){
			request
				.put('/api/cycles/' + ids[0])
				.set('Authorization', 'Bearer ' + adminToken)
				.send({
					title: 'REPLACED',
					id: ids[0]
				})
				.expect(200)
				.end(function(err, res){
					assert.isNull(err);
					assert.equal(res.body.id, ids[0]);
					done();
				});
		});
	});

	describe('#delete', function(){
		it('rejects an anonymous delete', function(done){
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d')
				.expect(401)
				.end(done);
		});
		it('rejects a delete by a non-admin user', function(done){
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(403)
				.end(done);
		});
		it('refuses to delete a cycle that has projects', function(done){
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d')
				.set('Authorization', 'Bearer ' + adminToken)
				.expect(400)
				.end(done);
		});
		it('deletes a cycle without projects', function(done){
			request
				.delete('/api/cycles/' + ids[0])
				.set('Authorization', 'Bearer ' + adminToken)
				.expect(200)
				.end(done);
		});
	});

	// remove any cycles we just created
	after(function(done){
		if(!ids.length)
			return done();

		r.connect(global.setup.config.db, function(err, conn){
			r.table('cycles').getAll(ids).delete().run(conn, function(err, res){
				conn.close();
				done(err, res);
			});
		});
	});

});
