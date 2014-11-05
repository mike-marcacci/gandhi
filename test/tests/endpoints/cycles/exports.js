'use strict';

require('../../../init.js');

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

describe('Exports', function(){
	var adminToken, adminId, userToken, userId;

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

	describe('#list', function(){
		it('rejects an anonymous request', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/exports')
				.expect(401)
				.end(function(err, res){
					if(err) return done(err);
					assert.isNotArray(res.body);
					done();
				});
		});
		it('returns 404 for nonexistant cycle', function(done){
			request
				.get('/api/cycles/foo/exports')
				.set('Authorization', 'Bearer ' + adminToken)
				.expect(404)
				.end(done);
		});
		it('shows all exports to an admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/exports')
				.set('Authorization', 'Bearer ' + adminToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.lengthOf(Object.keys(res.body), 1);
					done();
				});
		});
		it('shows all exports to a non-admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/exports')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.lengthOf(Object.keys(res.body), 1);
					done();
				});
		});
	});

	describe('#get', function(){
		it('rejects an anonymous request', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/exports/proposal')
				.expect(401)
				.end(done);
		});
		it('returns 404 for nonexistant cycle', function(done){
			request
				.get('/api/cycles/foo/exports/proposal')
				.set('Authorization', 'Bearer ' + adminToken)
				.expect(404)
				.end(done);
		});
		it('shows a export to an admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/exports/proposal')
				.set('Authorization', 'Bearer ' + adminToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, 'proposal');
					done();
				});
		});
		it('shows a export to a non-admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/exports/proposal')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, 'proposal');
					done();
				});
		});
	});

	describe('#put', function(){
		it('rejects an anonymous put', function(done){
			request
				.put('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/exports/test')
				.send({id:'test',title:'Test',pointer:['contents','start','status'],template:null})
				.expect(401)
				.end(done);
		});
		it('rejects a put by a non-admin user', function(done){
			request
				.put('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/exports/test')
				.set('Authorization', 'Bearer ' + userToken)
				.send({id:'test',title:'Test',pointer:['contents','start','status'],template:null})
				.expect(403)
				.end(done);
		});
		it('rejects an invalid put', function(done){
			request
				.put('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/exports/test')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({foo:'bar'})
				.expect(400)
				.end(done);
		});
		it('returns 404 for nonexistant cycle', function(done){
			request
				.put('/api/cycles/foo/exports/proposal')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({id:'test',title:'Test',pointer:['contents','start','status'],template:null})
				.expect(404)
				.end(done);
		});
		it('allows a new put by an admin user', function(done){
			request
				.put('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/exports/test')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({id:'test',title:'Test',pointer:['contents','start','status'],template:null})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, 'test');
					done();
				});
		});
		it('allows an existing put by an admin user', function(done){
			request
				.put('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/exports/test')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({id:'test',title:'Test PUT',pointer:['contents','start','status'],template:null})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, 'test');
					assert.equal(res.body.title, 'Test PUT');
					done();
				});
		});
	});

	describe('#patch', function(){
		it('rejects an anonymous put', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/exports/test')
				.send({title:'Oops'})
				.expect(401)
				.end(done);
		});
		it('rejects a patch by a non-admin user', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/exports/test')
				.set('Authorization', 'Bearer ' + userToken)
				.send({title:'Oops'})
				.expect(403)
				.end(done);
		});
		it('rejects an invalid patch', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/exports/test')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({foo:'bar'})
				.expect(400)
				.end(done);
		});
		it('rejects a new patch by an admin user', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/exports/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({title:'Oops'})
				.expect(404)
				.end(function(err, res){
					if(err) return done(err);
					done();
				});
		});
		it('returns 404 for nonexistant cycle', function(done){
			request
				.patch('/api/cycles/foo/exports/proposal')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({title:'Oops'})
				.expect(404)
				.end(done);
		});
		it('allows an existing patch by an admin user', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/exports/test')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({title:'Patched'})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.title, 'Patched');
					done();
				});
		});
	});

	describe('#delete', function(){
		it('rejects an anonymous delete', function(done){
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/exports/test')
				.expect(401)
				.end(done);
		});
		it('rejects a delete by a non-admin user', function(done){
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/exports/test')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(403)
				.end(done);
		});
		it('returns 404 for nonexistant cycle', function(done){
			request
				.delete('/api/cycles/foo/exports/proposal')
				.set('Authorization', 'Bearer ' + adminToken)
				.expect(404)
				.end(done);
		});
		it('deletes a export for an admin user', function(done){
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/exports/test')
				.set('Authorization', 'Bearer ' + adminToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, 'test');
					done();
				});
		});
	});

});
