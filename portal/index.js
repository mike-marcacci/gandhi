angular.module('portal', [
	'ui.router',
	'restangular',
	
	// TODO: somehow allow components to add their own dependencies
	'angularFileUpload',
	'ngCkeditor'
])

.config(function($stateProvider, $urlRouterProvider, RestangularProvider) {
	$urlRouterProvider.otherwise("/portal");

	RestangularProvider.setBaseUrl('../api');
	RestangularProvider.addFullRequestInterceptor(function(element, operation, route, url, headers, params, httpConfig) {  
		return {
			element: element,
			params: params,
			headers: headers, // TODO: put JWT here
			httpConfig: httpConfig
		};
	});

})

.run(function($rootScope, Restangular, $window) {

	function setUser(token){
		$rootScope.user = null;

		if(token)
			$window.sessionStorage.token = JSON.stringify(token);

		if(typeof $window.sessionStorage.token == 'undefined')
			return;

	  var output = $window.sessionStorage.token.split('.')[1].replace('-', '+').replace('_', '/');
	  while (output.length % 4 > 0){ output += "=" };
	  
	  var parsed = JSON.parse(window.atob(output));

		Restangular.one("users", parsed.sub).get().then(function(user){
			$rootScope.user = user;
		}, function(err){
			console.log(err);
			$rootScope.logout();
		})
	}

	// set the user
	setUser();

	$rootScope.login = {
		email: 'mike.marcacci@gmail.com',
		password: '654321',
		submit: function(){
			Restangular.service('tokens').post({email: this.email, password: this.password})
				.then(function(data){
					setUser(data.token);
					$rootScope.login.reset();
				}, function(err){
					$rootScope.login.reset();
					if(err.data && err.data.message)
						alert(err.data.message);
					else
						alert('Unable to log in. Please try again.');
				})
		},
		reset: function(){
			this.password = '';
		}
	}

	$rootScope.signup = {
		name: 'Mike Marcacci',
		email: 'mike.marcacci@gmail.com',
		password: '654321',
		password2: '654321',
		submit: function(){
			if(this.password != this.password2)
				return alert('Passwords must match.');
			
			Restangular.service('users').post({name: this.name, email: this.email, password: this.password})
				.then(function(data){
					$rootScope.login.email = $rootScope.signup.email;
					$rootScope.login.password = $rootScope.signup.password;
					$rootScope.login.submit();
					$rootScope.signup.reset();
				}, function(err){
					if(err.data && err.data.message)
						alert(err.data.message);
					else
						alert('Unable to sign up. Please try again.');
				})
		},
		reset: function(){
			this.name = this.email = this.password = this.password2 = '';
		}
	}

	$rootScope.logout = function(){
		delete sessionStorage.token;
		$rootScope.user = null;
	}

})

.factory('authInterceptor', function ($rootScope, $q, $window) {
  return {
    request: function (config) {
      config.headers = config.headers || {};

      if ($window.sessionStorage.token)
        config.headers.Authorization = 'Bearer ' + $window.sessionStorage.token;

      return config;
    },
    response: function(response){
      return response;
    },
    responseError: function (rejection) {
      if (rejection.status === 401)
      	$rootScopt.logout();

      // TODO: alert the user somehow
      return $q.reject(rejection);
    }
  };
})

.config(function($httpProvider) {
  $httpProvider.interceptors.push('authInterceptor');
});

// .run(function($rootScope, validateUser) {
//     $rootScope.$on('$routeChangeSuccess', function () {
//         validateUser($rootScope);
//     })
// })
// .factory('validateUser', function($cookieStore, $http){
//     return function(scope) {
//         // Validate the cookie here...
//     }
// })
