'use strict';

require('../../init.js');

var r = require('rethinkdb');
var async = require('async');
var assert = require('chai').assert;
var request;

var blacklist = ['password'];
var whitelist = ['id','email','name'];

before(function(){
	request = global.setup.api;
});

describe('Users', function(){
	var adminToken, ids = [];

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
				done(err);
			});
	});

	describe('#create', function(){
		var userToken;
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
					done(err);
				});
		});

		it('rejects a misformatted user', function(done){
			request
				.post('/api/users')
				.send({
					cool: 'beans'
				})
				.expect(400)
				.end(function(err, res){
					done(err);
				});
		});

		it('prevents email collisions', function(done){
			request
				.post('/api/users')
				.send({
					email: 'tim.marcacci@test.gandhi.io',
					password: 'tim1234'
				})
				.expect(409)
				.end(function(err, res){
					assert.isNull(err);
					done(err);
				});
		});

		it('allows anonymous creation of a user', function(done){
			request
				.post('/api/users')
				.send({
					email: 'emily.marcacci@test.gandhi.io',
					password: 'emily1234'
				})
				.expect(201)
				.end(function(err, res){
					assert.isNull(err);
					assert.isString(res.body.id);
					ids.push(res.body.id);
					assert.equal(res.body.email, 'emily.marcacci@test.gandhi.io');
					blacklist.forEach(function(prop){
						assert.notProperty(res.body, prop);
					});
					done(err);
				});
		});

		it('prevents anonymous creation of an admin user', function(done){
			request
				.post('/api/users')
				.send({
					email: 'solène.clavel@test.gandhi.io',
					password: 'solène1234',
					admin: true
				})
				.expect(403)
				.end(function(err, res){
					assert.isUndefined(res.body.id);
					done(err);
				});
		});

		it('prevents creation of an admin user by a non-admin user', function(done){
			request
				.post('/api/users')
				.set('Authorization', 'Bearer ' + userToken)
				.send({
					email: 'solène.clavel@test.gandhi.io',
					password: 'solène1234',
					admin: true
				})
				.expect(403)
				.end(function(err, res){
					assert.isUndefined(res.body.id);
					done(err);
				});
		});

		it('allows creation of an admin user by an admin user', function(done){
			request
				.post('/api/users')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({
					email: 'solène.clavel@test.gandhi.io',
					password: 'solène1234',
					admin: true
				})
				.expect(201)
				.end(function(err, res){
					assert.isNull(err);
					assert.isString(res.body.id);
					ids.push(res.body.id);
					assert.equal(res.body.email, 'solène.clavel@test.gandhi.io');
					blacklist.forEach(function(prop){
						assert.notProperty(res.body, prop);
					});
					done(err);
				});
		});
	});

	describe('#read', function(){
		var userToken;
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
					done(err);
				});
		});

		describe('(list)', function(){
			it('rejects an anonymous request', function(){});
			it('only returns whitelisted fields to unaffiliated users', function(){});
			it('returns all non-blacklisted fields to self', function(){});
			it('returns all non-blacklisted fields to admin users', function(){});
		});

		describe('(show)', function(){
			it('rejects an anonymous request', function(){});
			it('only returns whitelisted fields to unaffiliated users', function(){});
			it('returns all non-blacklisted fields to self', function(){});
			it('returns all non-blacklisted fields to admin users', function(){});
		});
	});

	describe('#update', function(){
		var userToken;
		before(function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'emily.marcacci@test.gandhi.io',
					password: 'emily1234'
				})
				.expect(201)
				.end(function(err, res){
					assert.isNull(err);
					assert.isString(res.body.token);
					userToken = res.body.token;
					done(err);
				});
		});

		it('rejects an anonymous update', function(){});
		it('rejects an update from an unaffiliated user', function(){});
		it('processes an update from self', function(){});
		it('processes an update from an admin user', function(){});
		it('rejects a misformatted update', function(){});
		it('rejects a misformatted update', function(){});
	});

	describe('#delete', function(){
		var userToken;
		before(function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'emily.marcacci@test.gandhi.io',
					password: 'emily1234'
				})
				.expect(201)
				.end(function(err, res){
					assert.isNull(err);
					assert.isString(res.body.token);
					userToken = res.body.token;
					done(err);
				});
		});

		it('rejects an anonymous update', function(){});
		it('rejects an update from an unaffiliated user', function(){});
		it('rejects an update from self', function(){});
		it('processes an update from an admin user', function(){});
	});

	// remove any users we just created
	after(function(done){
		if(!ids.length)
			return done(err);

		r.connect(global.setup.config.db, function(err, conn){
			r.table('users').getAll(ids).delete().run(conn, function(err, res){
				conn.close();
				done(err, res);
			})
		});
	})

});
