angular.module('gandhi', [
	'ui.router',
	'restangular',
	'ngTable',
	'ngSanitize',
	
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

.run(function($rootScope, Restangular, $window, $state, $stateParams) {
	$rootScope.$state = $state;
	$rootScope.$stateParams = $stateParams;

	function setUser(token){
		$rootScope.currentUser = null;

		if(token)
			$window.localStorage.token = token;

		if(typeof $window.localStorage.token == 'undefined')
			return;

	  var output = $window.localStorage.token.split('.')[1].replace('-', '+').replace('_', '/');
	  while (output.length % 4 > 0){ output += "=" };
	  
	  var parsed = JSON.parse(window.atob(output));

		Restangular.one("users", parsed.sub).get().then(function(user){
			$rootScope.currentUser = user;
		}, function(err){
			console.log(err);
			$rootScope.logout();
		})
	}

	// set the user
	setUser();

	$rootScope.login = {
		email: '',
		password: '',
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
		name: '',
		email: '',
		password: '',
		password2: '',
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
		delete localStorage.token;
		$rootScope.currentUser = null;
	}

})

.factory('authInterceptor', function ($rootScope, $q, $window) {
  return {
    request: function (config) {
      config.headers = config.headers || {};

      if ($window.localStorage.token)
        config.headers.Authorization = 'Bearer ' + $window.localStorage.token;

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
