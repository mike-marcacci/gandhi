'use strict';

require('../../../init.js');

var li = require('li');
var jwt = require('jsonwebtoken');

var assert = require('chai').assert;
var request, fixtures;

var blacklist = ['password', 'recovery_token'];
var whitelist = ['id', 'email', 'name', 'href', 'admin', 'created','updated'];

before(function(){
	request = global.setup.api;
	fixtures = global.setup.fixtures.db.cycles;
});

describe('Stages', function(){
	var adminToken, adminId, userToken, userId, stageId;

	before(function(done){
		request
			.post('/api/tokens')
			.send({
				email: 'mike.marcacci@test.gandhi.io',
				password: 'mike1234'
			})
			.expect(201)
			.expect(function(res){
				assert.isString(res.body.token);
				adminToken = res.body.token;
				adminId = jwt.decode(adminToken).sub;
			})
			.end(done);
	});

	before(function(done){
		request
			.post('/api/tokens')
			.send({
				email: 'tim.marcacci@test.gandhi.io',
				password: 'tim1234'
			})
			.expect(201)
			.expect(function(res){
				assert.isString(res.body.token);
				userToken = res.body.token;
				userId = jwt.decode(userToken).sub;
			})
			.end(done);
	});

	describe('#list', function(){
		it('rejects an anonymous request', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/stages')
				.expect(401)
				.expect(function(res){
					assert.isNotArray(res.body);
				})
				.end(done);
		});
		it('shows all stages to an admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/stages')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res){
					assert.lengthOf(Object.keys(res.body), 7);
				})
				.end(done);
		});
		it('shows all stages to a non-admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/stages')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.expect(function(res){
					assert.lengthOf(Object.keys(res.body), 7);
				})
				.end(done);
		});
	});

	describe('#get', function(){
		it('rejects an anonymous request', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/stages/application')
				.expect(401)
				.end(done);
		});
		it('shows a stage to an admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/stages/application')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, 'application');
				})
				.end(done);
		});
		it('shows a stage to a non-admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/stages/application')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, 'application');
				})
				.end(done);
		});
	});

	describe('#post', function(){
		it('rejects an anonymous post', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/stages')
				.send({title:'Test',component:{name:'form'}})
				.expect(401)
				.end(done);
		});
		it('rejects a post by a non-admin user', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/stages')
				.set('Authorization', 'Bearer ' + userToken)
				.send({title:'Test',component:{name:'form'}})
				.expect(403)
				.end(done);
		});
		it('rejects an invalid post', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/stages')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({title: true})
				.expect(400)
				.end(done);
		});
		it('rejects a post with mismatched ID', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/stages')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'foo',title:'Test',component:{name:'form'}})
				.expect(400)
				.end(done);
		});
		it('allows a post by an admin user', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/stages')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({title:'Test',component:{name:'form'}})
				.expect(200)
				.expect(function(res){
					assert.isString(res.body.id);
					stageId = res.body.id;
				})
				.end(done);
		});
	});

	describe('#patch', function(){
		it('rejects an anonymous post', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/stages/' + stageId)
				.send({title:'Oops'})
				.expect(401)
				.end(done);
		});
		it('rejects a patch by a non-admin user', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/stages/' + stageId)
				.set('Authorization', 'Bearer ' + userToken)
				.send({title:'Oops'})
				.expect(403)
				.end(done);
		});
		it('rejects an invalid patch', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/stages/' + stageId)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({title: true})
				.expect(400)
				.end(done);
		});
		it('rejects an invalid patch', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/stages/' + stageId)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'foo',title:'Test',component:{name:'form'}})
				.expect(400)
				.end(done);
		});
		it('rejects a new patch by an admin user', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/stages/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({title:'Oops'})
				.expect(404)
				.expect(function(res){
				})
				.end(done);
		});
		it('allows an existing patch by an admin user', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/stages/' + stageId)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({title:'Patched'})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.title, 'Patched');
				})
				.end(done);
		});
	});

	describe('#delete', function(){
		it('rejects an anonymous delete', function(done){
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/stages/' + stageId)
				.expect(401)
				.end(done);
		});
		it('rejects a delete by a non-admin user', function(done){
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/stages/' + stageId)
				.set('Authorization', 'Bearer ' + userToken)
				.expect(403)
				.end(done);
		});
		it('deletes a stage for an admin user', function(done){
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/stages/' + stageId)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, stageId);
				})
				.end(done);
		});
		it('no longer shows deleted stage', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/stages/' + stageId)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
	});

});
