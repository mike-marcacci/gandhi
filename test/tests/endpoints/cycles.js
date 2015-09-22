'use strict';

require('../../init.js');

var li = require('li');
var r = require('rethinkdb');
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
				.query({admin: true})
				.send({
					cool: 'beans'
				})
				.expect(400)
				.expect(function(res){
				})
				.end(done);
		});
		it('allows creation of minimal cycle', function(done){
			request
				.post('/api/cycles')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({
					title: 'Awesome Possum'
				})
				.expect(201)
				.expect(function(res){
					assert.isString(res.body.id);
					ids.push(res.body.id);
					assert.equal(res.body.title, 'Awesome Possum');
					assert.equal(res.body.status_id, 'draft');
				})
				.end(done);
		});
		it.skip('copies and merges a cycle specified with the `copy` param', function(){});
	});

	describe('#list', function(){
		it('rejects an anonymous request', function(done){
			request
				.get('/api/cycles')
				.expect(401)
				.expect(function(res){
					assert.isNotArray(res.body);
				})
				.end(done);
		});
		it('shows all cycles to an admin user', function(done){
			request
				.get('/api/cycles')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res){
					assert.isArray(res.body);
					assert.lengthOf(res.body, fixtures.length + ids.length);
				})
				.end(done);
		});
		it('hides draft cycles from a non-admin user', function(done){
			request
				.get('/api/cycles')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.expect(function(res){
					assert.isArray(res.body);
					assert.lengthOf(res.body, 1);
				})
				.end(done);
		});
		it('accepts per_page parameters', function(done){
			request
				.get('/api/cycles')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({
					per_page: 2,
					admin: true
				})
				.expect(200)
				.expect(function(res){
					assert.isArray(res.body);
					assert.lengthOf(res.body, 2);
					// var links = li.parse(res.headers.link);
					// assert.equal(links.next, '/api/cycles?per_page=2&page=2&admin=true');
					// assert.equal(links.last, '/api/cycles?per_page=2&page=2&admin=true');
				})
				.end(done);
		});
		it('accepts page parameters', function(done){
			request
				.get('/api/cycles')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({
					per_page: 2,
					page: 2,
					admin: true
				})
				.expect(200)
				.expect(function(res){
					assert.isArray(res.body);
					assert.lengthOf(res.body, 1);
					// var links = li.parse(res.headers.link);
					// assert.equal(links.first, '/api/cycles?per_page=2&page=1&admin=true');
					// assert.equal(links.prev, '/api/cycles?per_page=2&page=1&admin=true');
				})
				.end(done);
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
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('shows a non-draft cycle to an admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d')
				.query({admin: true})
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, '128f2348-99d4-40a1-b5ab-91d9019f272d');
				})
				.end(done);
		});
		it('shows a draft cycle to an admin user', function(done){
			request
				.get('/api/cycles/e5f58a2c-2894-40e6-91a9-a110d190e85f')
				.query({admin: true})
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, 'e5f58a2c-2894-40e6-91a9-a110d190e85f');
				})
				.end(done);
		});
		it('shows a non-draft cycle to a non-admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, '128f2348-99d4-40a1-b5ab-91d9019f272d');
				})
				.end(done);
		});
		it('hides a draft cycle from a non-admin user', function(done){
			request
				.get('/api/cycles/e5f58a2c-2894-40e6-91a9-a110d190e85f')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(403)
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
				.query({admin: true})
				.send({title: 'UPDATED'})
				.expect(404)
				.end(done);
		});
		it('allows an update by an admin user', function(done){
			request
				.patch('/api/cycles/' + ids[0])
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({title: 'UPDATED'})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, ids[0]);
				})
				.end(done);
		});
	});

	describe.skip('#put', function(){
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
				.query({admin: true})
				.send({title: 'REPLACED', id: ids[0]})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, ids[0]);
				})
				.end(done);
		});
	});

	describe('#delete', function(){
		it('rejects an anonymous delete', function(done){
			request
				.delete('/api/cycles/' + ids[0])
				.expect(401)
				.end(done);
		});
		it('rejects a delete by a non-admin user', function(done){
			request
				.delete('/api/cycles/' + ids[0])
				.set('Authorization', 'Bearer ' + userToken)
				.query({admin: true})
				.expect(403)
				.end(done);
		});
		it('refuses to delete a cycle that has projects', function(done){
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(423)
				.end(done);
		});
		it('returns 404 for nonexistant cycle', function(done){
			request
				.delete('/api/cycles/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('deletes a cycle without projects', function(done){
			request
				.delete('/api/cycles/' + ids[0])
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
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
