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
	var adminToken, adminId, ids = [];

	before(function(done){
		request
			.post('/api/tokens')
			.send({
				email: 'mike.marcacci@test.gandhi.io',
				password: 'mike1234'
			})
			.expect(201)
			.end(function(err, res){
				assert.isString(res.body.token);
				adminToken = res.body.token;
				adminId = jwt.decode(adminToken).sub;
				done(err);
			});
	});

	describe('#create', function(){
		it.skip('prevents anonymous creation', function(done){
			request
				.post('/api/cycles')
				.send({
					cool: 'beans'
				})
				.expect(401)
				.end(function(err, res){
					done(err);
				});
		});
		it.skip('prevents non-admin creation', function(){});
		it.skip('rejects a misformatted cycle', function(done){
			request
				.post('/api/cycles')
				.send({
					cool: 'beans'
				})
				.expect(400)
				.end(function(err, res){
					done(err);
				});
		});
		it.skip('allows creation of minimal cycle', function(){});
	});

	describe('#read', function(){
		describe('(list) /cycles', function(){
			it('rejects an anonymous request', function(done){
				request
					.get('/api/cycles')
					.expect(401)
					.end(function(err, res){
						assert.isNotArray(res.body);
						done(err);
					});
			});
			it.skip('shows all cycles to an admin user', function(){});
			it.skip('hides draft cycles from a non-admin user', function(){});
			it.skip('accepts per_page parameters', function(done){
				request
					.get('/api/cycles?per_page=5')
					.set('Authorization', 'Bearer ' + userToken)
					.expect(200)
					.end(function(err, res){
						assert.isArray(res.body);
						assert.lengthOf(res.body, 5);
						var links = li.parse(res.headers.link);
						assert.equal(links.next, '/api/cycles?per_page=5&page=2');
						assert.equal(links.last, '/api/cycles?per_page=5&page='+Math.ceil((fixtures.length + ids.length) / 5));
						done(err);
					});
			});
			it.skip('accepts page parameters', function(done){
				request
					.get('/api/cycles?per_page=5&page=2')
					.set('Authorization', 'Bearer ' + userToken)
					.expect(200)
					.end(function(err, res){
						assert.isArray(res.body);
						assert.lengthOf(res.body, 5);
						var links = li.parse(res.headers.link);
						assert.equal(links.first, '/api/cycles?per_page=5&page=1');
						assert.equal(links.prev, '/api/cycles?per_page=5&page=1');
						done(err);
					});
			});
		});

		describe('(show) /cycles/:id', function(){
			it('rejects an anonymous request', function(done){
				request
					.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d')
					.expect(401)
					.end(function(err, res){
						assert.isNotArray(res.body);
						done(err);
					});
			});
			it.skip('shows all cycles to an admin user', function(){});
			it.skip('shows non-draft cycles to a non-admin user', function(){});
			it.skip('hides draft cycles from a non-admin user', function(){});
		});
	});

	describe('#update', function(){
		it.skip('rejects an anonymous update', function(){});
		it.skip('rejects an update by a non-admin user', function(){});
	});

	describe('#delete', function(){
		it.skip('rejects an anonymous delete', function(){});
		it.skip('rejects a delete by a non-admin user', function(){});
		it.skip('refuses to delete a cycle that has projects', function(){});
		it.skip('deletes a cycle without projects', function(){});
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
