// Global Settings
// ---------------
//
// Configure any external dependencies

ace.config.set('basePath', 'assets/bower/ace-builds/src-min-noconflict/');
CKEDITOR.basePath = 'assets/ckeditor/';
CKEDITOR.plugins.basePath = 'assets/ckeditor/plugins/';



// Gandhi
// ------
// 
// This is the base module for the entire app.

angular.module('gandhi')

.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	'use strict';

	// set the home routes
	$urlRouterProvider.otherwise('/');

}])

.run(['$rootScope', 'auth', '$state', '$stateParams', function($rootScope, auth, $state, $stateParams) {
	'use strict';

	$rootScope.$state = $state;
	$rootScope.$stateParams = $stateParams;
}])

// set up Google Analytics
.run(['$rootScope', '$location', '$window', function($rootScope, $location, $window){
	'use strict';

	$rootScope.$on('$stateChangeSuccess', function(){
		if (!$window.ga) return;
		$window.ga('send', 'pageview', { page: $location.path() });
	});
}])

// Resources
// ---------

.config(['$httpProvider', function($httpProvider) {
	'use strict';

	$httpProvider.defaults.headers.patch = {
		'Content-Type': 'application/json;charset=utf-8'
	};
}])

.factory('Token', ['$resource', function($resource){
	'use strict';
	
	return $resource('api/tokens', {}, {
		create: {method: 'POST'},
		update: {method: 'PATCH'},
		save: {method: 'PUT'}
	});
}])

.factory('User', ['$resource', function($resource){
	'use strict';
	
	return $resource('api/users/:id', {}, {
		create: {method: 'POST'},
		update: {method: 'PATCH'},
		save: {method: 'PUT'}
	});
}])

.factory('Cycle', ['$resource', function($resource){
	'use strict';
	
	return $resource('api/cycles/:id', {}, {
		create: {method: 'POST'},
		update: {method: 'PATCH'},
		save: {method: 'PUT'}
	});
}])

.factory('Role', ['$resource', function($resource){
	'use strict';
	
	return $resource('api/cycles/:cycle/roles/:id', {}, {
		update: {method: 'PATCH'},
		save: {method: 'PUT'}
	});
}])

.factory('Project', ['$resource', function($resource){
	'use strict';
	
	return $resource('api/projects/:id', {}, {
		create: {method: 'POST'},
		update: {method: 'PATCH'},
		save: {method: 'PUT'}
	});
}])


// Authentication
// --------------
//
// Gandhi uses JSON Web Tokens for authentication instead of sessions. The tokens
// must be passed in the Authorization header of each request.

.factory('auth', ['$rootScope', '$window', '$q', 'Token', 'User', function($rootScope, $window, $q, Token, User){
	'use strict';

	function logout() {
		delete localStorage.token;
		$rootScope.currentUser = null;
	}

	function setUser(token) {
		$rootScope.currentUser = null;

		if(token)
			$window.localStorage.token = token;

		if(typeof $window.localStorage.token == 'undefined')
			return $q.when(true);

		var output = $window.localStorage.token.split('.')[1].replace('-', '+').replace('_', '/');
		while (output.length % 4 > 0){ output += '='; }

		var parsed = JSON.parse(window.atob(output));

		return User.get({id: parsed.sub}).$promise
		.catch(function(err){
			logout();
			return $q.reject(err);
		})
		.then(function(user){
			$rootScope.currentUser = user;
			return $rootScope.currentUser;
		});
	}

	function login(data) {
		if(!data || !data.email)
			return $q.reject(new Error('Email is required'));

		return new Token(data).$create().then(function(token){
			return setUser(token.token);
		});
	}

	function signup(data){
		if(!data || !data.email)
			return $q.reject(new Error('Email is required'));

		if(!data.password)
			return $q.reject(new Error('Password is required'));

		return new User(data).$create().then(function(){ login(data); }, $q.reject);
	}

	function recover(data) {
		if(!data || !data.email)
			return $q.reject(new Error('Email is required'));

		return new Token({email: data.email}).$create();
	}

	function validate(){
		// check for token
		if(!$window.localStorage.token)
			return logout();

		var output = $window.localStorage.token.split('.')[1].replace('-', '+').replace('_', '/');
		while (output.length % 4 > 0){ output += '='; }

		// check JSON format
		var parsed;
		try { parsed = JSON.parse(window.atob(output)); }
		catch(e){ return logout(); }

		// check expiration
		if(!parsed.exp || parsed.exp < (Date.now() / 1000))
			return logout();
	}

	// set the user
	setUser();

	return {
		login: login,
		logout: logout,
		signup: signup,
		recover: recover,
		validate: validate
	};
}])

.factory('authInterceptor', ['$rootScope', '$window', '$q', function($rootScope, $window, $q) {
	'use strict';

	return {
		request: function (config) {

			// TODO: make sure this is requesting the same domain

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
				$rootScope.logout();

			// TODO: alert the user somehow
			return $q.reject(rejection);
		}
	};
}])

.config(['$httpProvider', '$stateProvider', '$windowProvider', function($httpProvider, $stateProvider, $windowProvider){
	'use strict';

	// add interceptor to all HTTP requests
	$httpProvider.interceptors.push('authInterceptor');

	// add recovery route
	$stateProvider.state('recovery', {
		url: '/recovery',
		templateUrl: 'recovery.html',
		resolve: {},
		controller: ['$scope', '$state', function($scope, $state){
			$scope.recovery = {
				password: '',
				password2: ''
			};

			$scope.submit = function(){
				if(!$scope.recovery.password || $scope.recovery.password === '')
					return $windowProvider.alert('You must submit a new password.');

				if($scope.recovery.password !== $scope.recovery.password2)
					return $windowProvider.alert('Your passwords do not match.');

				$scope.currentUser.$update({password: $scope.recovery.password}).$promise.then(function(user){

					// update the local user
					angular.extend($scope.currentUser, user);

					// redirect to the dashboard
					$state.go('portal.dashboard');
				}, function(err){
					if(err.data && err.data.message)
						$windowProvider.alert(err.data.message);
					else
						$windowProvider.alert('There was a problem saving your changes.');
				});
			};
		}]
	});

}])

.run(['$rootScope', 'auth', '$state', '$stateParams', '$location', '$window', function($rootScope, auth, $state, $stateParams, $location, $window) {
	'use strict';

	// add convenience method to scope
	$rootScope.logout = auth.logout;

	// validate the current user
	$rootScope.$on('$stateChangeSuccess', function() {
		auth.validate();
	});

	// intercept recovery links
	var recovery_token, email;
	if( (recovery_token = $location.search().recovery_token) ) {
		while (recovery_token.length % 4 > 0){ recovery_token += '='; }
		if( (email = JSON.parse(atob(recovery_token)).email) ){
			auth.login({
				email: email,
				recovery_token: recovery_token
			})
			.catch(function(err){
				if(err.data && err.data.message)
					$window.alert(err.data.message);
				else
					$window.alert('Unable to recover your account. Please try again.');
				
				// chances are they're on the recovery page; let's get them out of here
				$state.go('portal.dashboard');
			});
		} else {
			$window.alert('Invalid recovery token.');
		}

		$location.search('recovery_token', null);
	}

}])



// Generic Helpers
// ---------------

.factory('uuid', function(){
	'use strict';

	return function(){
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		});
	};
})

.directive('selectOnClick', function () {
	'use strict';

	return {
		restrict: 'A',
		link: function (scope, element) {
			element.on('click', function () {
				this.select();
			});
		}
	};
})

.run(['$rootScope', function($rootScope) {
	'use strict';

	$rootScope.collapseSidebar = false;
	$rootScope.toggleSidebar = function(){
		$rootScope.collapseSidebar = !$rootScope.collapseSidebar;
	};

	$rootScope.showNavigation = false;
	$rootScope.toggleNavigation = function(){
		$rootScope.showNavigation = !$rootScope.showNavigation;
	};
}])



// Login Controller
// ----------------

.controller('LoginController', ['$scope', 'auth', '$window', function($scope, auth, $window) {
	'use strict';

	$scope.email = '';
	$scope.password = '';

	$scope.submit = function(){
		if(!$scope.email || !$scope.password)
			return $window.alert('Your email and password are required to log in.');

		auth.login({email: $scope.email, password: $scope.password})
			.then(function(){
				$scope.reset();
			}, function(err){
				$scope.reset();
				if(err.data && err.data.message)
					$window.alert(err.data.message);
				else
					$window.alert('Unable to log in. Please try again.');
			});
	};

	$scope.recover = function(){
		if(!$scope.email)
			return $window.alert('Your email is required to recover your account.');

		auth.recover({email: $scope.email})
			.then(function(){
				$window.alert('You have been sent an email with a recovery link.');
			}, function(err){
				if(err.data && err.data.message)
					$window.alert(err.data.message);
				else
					$window.alert('Unable to recover your account. Please try again.');
			});
	};

	$scope.reset = function(){
		$scope.password = '';
	};

}])


// Signup Controller
// -----------------

.controller('SignupController', ['$scope', 'auth', '$window', function($scope, auth, $window){
	'use strict';

	$scope.name = '';
	$scope.email = '';
	$scope.password = '';
	$scope.password2 = '';

	$scope.submit = function(){
		if($scope.password != $scope.password2)
			return $window.alert('Passwords must match.');

		auth.signup({name: $scope.name, email: $scope.email, password: $scope.password})
			.then(function(){
				$scope.reset();
			}, function(err){
				if(err.data && err.data.message)
					$window.alert(err.data.message);
				else
					$window.alert('Unable to sign up. Please try again.');
			});
	};

	$scope.reset = function(){
		$scope.name = $scope.email = $scope.password = $scope.password2 = '';
	};
}]);



