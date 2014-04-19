// var assert = require("assert");
// var request = require('request');
// var apiUrl = 'http://localhost:3000';

// describe('Token', function(){
    
//   it('should block anonymous access to protected paths', function(done){
//     request.get(apiUrl + '/users', {}, function(err, res, body) {
//       assert.equal(res.statusCode, 401);
//       done();
//     });
//   });

//   it('should allow anonymous access to excluded paths', function(done){
//     request.post(apiUrl + '/token', {}, function(err, res, body) {
//       assert.notEqual(res.statusCode, 401);
//       done();
//     });
//   });


//   var token;

//   /*************************
//    * Begin endpoint tests
//    */

//   it('should not return a token for invalid credentials', function(done){
//     request({ uri: apiUrl + '/token', form: {id: 'mike-marcacci', password: 'wrong-password'}, method: 'post', json: true}, function(err, res, body) {
//       assert.equal(res.statusCode, 401);
//       done();
//     });
//   });

//   it('should return a token for valid credentials', function(done){
//     request({ uri: apiUrl + '/token', form: {id: 'mike-marcacci', password: '654321'}, method: 'post', json: true}, function(err, res, body) {
//       assert.equal(res.statusCode, 201);
//       assert(typeof body.result.token != 'undefined');
//       token = body.result.token;
//       done();
//     });
//   });

//   /*
//    * End endpoint tests
//    *************************/

//   it('should allow authenticated access to protected paths', function(done){
//     request({ uri: apiUrl + '/campaigns', method: 'get', headers: {'Authorization': 'Bearer '+token}}, function(err, res, body) {
//       console.log(body);
//       assert.equal(res.statusCode, 200);
//       done();
//     });
//   });

// });
