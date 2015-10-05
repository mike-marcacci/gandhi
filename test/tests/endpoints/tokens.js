'use strict';

require('../../init.js');

var assert = require('chai').assert;
var request;

before(function(){
	request = global.setup.api;
});

describe('Tokens', function(){
	it('rejects misformatted credentials', function(done){
		request
			.post('/api/tokens')
			.send({
				cool: 'beans'
			})
			.expect(400)
			.expect(function(res){
				assert.isUndefined(res.body.token);
			})
			.end(done);
	});
	describe('#password', function(){
		it('rejects unknown email', function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'null@test.gandhi.io',
					password: '123456'
				})
				.expect(404)
				.expect(function(res){
					assert.isUndefined(res.body.token);
				})
				.end(done);
		});
		it('rejects incorrect password', function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'mike.marcacci@test.gandhi.io',
					password: 'wrong password'
				})
				.expect(401)
				.expect(function(res){
					assert.isUndefined(res.body.token);
				})
				.end(done);
		});
		it('returns a token for a valid password', function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'mike.marcacci@test.gandhi.io',
					password: 'mike1234'
				})
				.expect(201)
				.expect(function(res){
					assert.isString(res.body.token);
				})
				.end(done);
		});
	});
	describe('#recovery_token', function(){
		it('rejects unknown email', function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'null@test.gandhi.io',
					recovery_token: '123456'
				})
				.expect(404)
				.expect(function(res){
					assert.isUndefined(res.body.token);
				})
				.end(done);
		});
		it('rejects misformatted recovery token', function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'tim.marcacci@test.gandhi.io',
					recovery_token: 'misformatted recovery_token'
				})
				.expect(401)
				.expect(function(res){
					assert.isUndefined(res.body.token);
				})
				.end(done);
		});
		it('rejects incorrect recovery token', function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'tim.marcacci@test.gandhi.io',
					recovery_token: 'eyJleHBpcmF0aW9uIjozMjUzNTEyOTYwMDAwMCwic2VjcmV0IjoiazRBUmxHV0RWL3NSZGVHMEdRM2ppYzQxYW1zRG16ZWxsRFJrcnpOYWhnZWZKWTU2S0Q1UGRhUEVvWnpEVWN0K2tzYUtpZlVYUU4zZ1hHNDhhMkxBaTMrYmJ5SndGaVVDZ0pLUVdRbXVTcTNUNUpsWVoxbHdaTUFXTVkxZ09ydGU3bnFCdHpnbzl5MlpCSEUzM0llM1MwNUJ2N1hQSVMvaWFFeHZleXl6LzZVNGxJY0s1RitGOHJZS1ZuZk42SmNxQjMyNlJ6WFBmdjVFaXorTjVCazY3N2RCWlh6aDFla2tTNW1VeTdENDZ1ejBUOGVqM2Iwcm90bGxHUytYYjQ3b0RlZFZYOGY1aDNnL3ZWa3c1bXR1SUIrb3JLM2NJaVREODdvaFA1SVM1azRCMDFvcDlTakNkTS92V0Y4TEl4S2kwZWtYYmI4c3VXWlRHQmR1Tjd3Z05RPT0ifQ=='
				})
				.expect(401)
				.expect(function(res){
					assert.isUndefined(res.body.token);
				})
				.end(done);
		});
		it.skip('rejects expired recovery token', function(done){

			// we changed the expiration to use seconds instead of ms, and we need to generate
			// another expired test recovery token

			request
				.post('/api/tokens')
				.send({
					email: 'dustin.towery@test.gandhi.io',
					recovery_token: 'eyJleHBpcmF0aW9uIjo5NDY2ODQ4MDAwMDAsInNlY3JldCI6Ik1weFlwMUpvd3RLN0tVaDIzZXcwK0NSSE1MdVpWSnZmMHQ1dG84UEtGNGVoYlNPTWZxbHNtLzJVWjBSc1ErR3BVK2ZaVHl1RklJRWo2czUvUTVWeEthZ1NhMG50VEVieE85M2FEUTdDQmZNUkwxUjhGRSsySFNwdTU3K2w1ajZmbnV2MDNvbkxDY2ltTUZ1UjZ6WFZvNVI0UnBvdDNMTTJjNlFRM1p0SzdRUFAwa2IvdDlXeVVocWZiMlhnVkh6K0srSUxTaXd5Z2dBU2ZpeHBYYlNGNXB0bTlIb3dtWlZYbUYwQnRmWnF6c09sNElyM1U3UVJaalFzdnVmUFJjMGQxV2tIVWNvcENLSnJma2JmMTFjanFRSGEydmFNSnJyQXVYZUZaeG9ZaEhtYWdFVXM1Q3NrMjAvR3ZUaXJmRXFPbHA4K0hiamRMWC83alZDR3JVQysxQT09In0='
				})
				.expect(401)
				.expect(function(res){
					assert.isUndefined(res.body.token);
				})
				.end(done);
		});
		it('returns a token for a valid recovery token', function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'tim.marcacci@test.gandhi.io',
					recovery_token: 'eyJleHBpcmF0aW9uIjozMjUzNTEyOTYwMDAwMCwic2VjcmV0IjoiWm1mazNuYjlndEw3c2hNQ1QrbjBGOTZ3cG50cHR3d0xNWVpnWjk0emlTaDgvQ1pqQmE0c3RJVDN2M2hDMWtqZ0QzcURmeWxtd1JBd1l5MVlybTlOQUtab3dCb1VWMTA3a1NmU0QvTFlFYThaUEdJckVoV3dxS2dYckdQZFp6Y2w5TUVLVEFJS1N1VVVwTUQ0aDU4bFlzVEZMSTZMQXBzaUlIN2hSbkJBRFVmWEk5b0JhTHo2NWppeTFheWhyU2xwdlZZYTZ5TkxOaUgvMFArTGNNM0FXaDJXZFFuN1BEQ3B0S0VyN0ZVV0pmNjFXU25SbmRJV0xodEcrUkQ5UXhaTkRvS1hSam05YXBJT2dzR0pIcnJGaXlzRVlhOEFibnd2ZjNNM0I5VzU2YXRrdjcwZnlocGx3U2lrcFo3bnNTVVpFMm1UWE1jb20zeHh5ektWdlE4MVVBPT0ifQ=='
				})
				.expect(201)
				.expect(function(res){
					assert.isString(res.body.token);
				})
				.end(done);
		});
		it('rejects a token that has already been used', function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'tim.marcacci@test.gandhi.io',
					recovery_token: 'eyJleHBpcmF0aW9uIjozMjUzNTEyOTYwMDAwMCwic2VjcmV0IjoiWm1mazNuYjlndEw3c2hNQ1QrbjBGOTZ3cG50cHR3d0xNWVpnWjk0emlTaDgvQ1pqQmE0c3RJVDN2M2hDMWtqZ0QzcURmeWxtd1JBd1l5MVlybTlOQUtab3dCb1VWMTA3a1NmU0QvTFlFYThaUEdJckVoV3dxS2dYckdQZFp6Y2w5TUVLVEFJS1N1VVVwTUQ0aDU4bFlzVEZMSTZMQXBzaUlIN2hSbkJBRFVmWEk5b0JhTHo2NWppeTFheWhyU2xwdlZZYTZ5TkxOaUgvMFArTGNNM0FXaDJXZFFuN1BEQ3B0S0VyN0ZVV0pmNjFXU25SbmRJV0xodEcrUkQ5UXhaTkRvS1hSam05YXBJT2dzR0pIcnJGaXlzRVlhOEFibnd2ZjNNM0I5VzU2YXRrdjcwZnlocGx3U2lrcFo3bnNTVVpFMm1UWE1jb20zeHh5ektWdlE4MVVBPT0ifQ=='
				})
				.expect(401)
				.expect(function(res){
					assert.isUndefined(res.body.token);
				})
				.end(done);
		});
	});
	describe('#email', function(){
		it('rejects unknown email', function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'null@test.gandhi.io'
				})
				.expect(404)
				.expect(function(res){
					assert.isUndefined(res.body.token);
				})
				.end(done);
		});

		// TODO: actually check the email and try the token

	});
	describe('#token', function(){
		var tim, mike;
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
					mike = res.body.token;
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
					tim = res.body.token;
				})
				.end(done);
		});
		it('rejects an invalid token', function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'tim.marcacci@test.gandhi.io',
					token: 'asdf'
				})
				.expect(401)
				.expect(function(res){
					assert.isUndefined(res.body.token);
				})
				.end(done);
		});
		it('rejects token from a different, non-admin user', function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'mike.marcacci@test.gandhi.io',
					token: tim
				})
				.expect(403)
				.expect(function(res){
					assert.isUndefined(res.body.token);
				})
				.end(done);
		});
		it('returns a token from the same non-admin user', function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'tim.marcacci@test.gandhi.io',
					token: tim
				})
				.expect(201)
				.expect(function(res){
					assert.isString(res.body.token);
				})
				.end(done);
		});
		it('returns a token from a different admin user', function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'tim.marcacci@test.gandhi.io',
					token: mike
				})
				.expect(201)
				.expect(function(res){
					assert.isString(res.body.token);
				})
				.end(done);
		});
	});
});
