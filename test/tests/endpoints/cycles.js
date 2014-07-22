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
		it('rejects a misformatted cycle', function(done){
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
		});

		describe('(show) /cycles/:id', function(){
			// it('rejects an anonymous request', function(done){
			// 	request
			// 		.get('/api/cycles/' + cycleId)
			// 		.expect(401)
			// 		.end(function(err, res){
			// 			assert.isNotArray(res.body);
			// 			done(err);
			// 		});
			// });
		});
	});

	describe('#update', function(){
		it.skip('rejects an anonymous update', function(){});
	});

	describe('#delete', function(){
		it.skip('rejects an anonymous delete', function(){});
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
