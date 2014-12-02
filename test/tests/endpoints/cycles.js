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

	describe('#post', function(){
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
					if(err) return done(err);
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
					if(err) return done(err);
					assert.isString(res.body.id);
					ids.push(res.body.id);
					assert.equal(res.body.title, 'Awesome Possum');
					assert.equal(res.body.status, 'draft');
					done();
				});
		});
	});

	describe('#list', function(){
		it('rejects an anonymous request', function(done){
			request
				.get('/api/cycles')
				.expect(401)
				.end(function(err, res){
					if(err) return done(err);
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
					if(err) return done(err);
					assert.isArray(res.body);
					assert.lengthOf(res.body, fixtures.length + ids.length);
					done();
				});
		});
		it('hides draft cycles from a non-admin user', function(done){
			request
				.get('/api/cycles')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.isArray(res.body);
					assert.lengthOf(res.body, 1);
					done();
				});
		});
		it('accepts per_page parameters', function(done){
			request
				.get('/api/cycles?per_page=2')
				.set('Authorization', 'Bearer ' + adminToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.isArray(res.body);
					assert.lengthOf(res.body, 2);
					var links = li.parse(res.headers.link);
					assert.equal(links.next, '/api/cycles?per_page=2&page=2');
					assert.equal(links.last, '/api/cycles?per_page=2&page=2');
					done();
				});
		});
		it('accepts page parameters', function(done){
			request
				.get('/api/cycles?per_page=2&page=2')
				.set('Authorization', 'Bearer ' + adminToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.isArray(res.body);
					assert.lengthOf(res.body, 1);
					var links = li.parse(res.headers.link);
					assert.equal(links.first, '/api/cycles?per_page=2&page=1');
					assert.equal(links.prev, '/api/cycles?per_page=2&page=1');
					done();
				});
		});
	});

	describe('#get', function(){
		it('rejects an anonymous request', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d')
				.expect(401)
				.end(done);
		});
		it('returns 404 for nonexistant cycle', function(done){
			request
				.get('/api/cycles/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.expect(404)
				.end(done);
		});
		it('shows a non-draft cycle to an admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d')
				.set('Authorization', 'Bearer ' + adminToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, '128f2348-99d4-40a1-b5ab-91d9019f272d');
					done();
				});
		});
		it('shows a draft cycle to an admin user', function(done){
			request
				.get('/api/cycles/e5f58a2c-2894-40e6-91a9-a110d190e85f')
				.set('Authorization', 'Bearer ' + adminToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, 'e5f58a2c-2894-40e6-91a9-a110d190e85f');
					done();
				});
		});
		it('shows a non-draft cycle to a non-admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, '128f2348-99d4-40a1-b5ab-91d9019f272d');
					done();
				});
		});
		it('hides a draft cycle from a non-admin user', function(done){
			request
				.get('/api/cycles/e5f58a2c-2894-40e6-91a9-a110d190e85f')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(404)
				.end(done);
		});
	});

	describe('#patch', function(){
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
		it('returns 404 for nonexistant cycle', function(done){
			request
				.patch('/api/cycles/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({title: 'UPDATED'})
				.expect(404)
				.end(done);
		});
		it('allows an updates by an admin user', function(done){
			request
				.patch('/api/cycles/' + ids[0])
				.set('Authorization', 'Bearer ' + adminToken)
				.send({title: 'UPDATED'})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, ids[0]);
					done();
				});
		});
	});

	describe('#put', function(){
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
		it('allows a replace by an admin user', function(done){
			request
				.put('/api/cycles/' + ids[0])
				.set('Authorization', 'Bearer ' + adminToken)
				.send({title: 'REPLACED',id: ids[0]})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
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
		it('returns 404 for nonexistant cycle', function(done){
			request
				.delete('/api/cycles/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.expect(404)
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

	// test embedded collections
	['statuses','roles','assignments','invitations','triggers','stages','exports'].forEach(function(c){
		require('./cycles/' + c);
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
