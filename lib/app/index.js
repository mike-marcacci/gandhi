// Global Settings
// ---------------
//
// Configure any external dependencies

ace.config.set('basePath', 'assets/bower/ace-builds/src-min-noconflict/');
// CKEDITOR.basePath = 'assets/ckeditor/';
// CKEDITOR.plugins.basePath = 'assets/ckeditor/plugins/';



// Gandhi
// ------
// 
// This is the base module for the entire app.

angular.module('gandhi')

.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	'use strict';

	// set the home routes
	$urlRouterProvider.otherwise('/');

	// the embed page
	$stateProvider.state('embed', {
		url: '/embed',
		templateUrl: 'embed.html',
		controller: ['$scope', function($scope){

		}]
	});
}])

.run(['$rootScope', 'auth', '$state', '$stateParams', function($rootScope, auth, $state, $stateParams) {
	'use strict';

	$rootScope.$state = $state;
	$rootScope.$stateParams = $stateParams;
}])


.run(['$rootScope', '$location', '$window', function($rootScope, $location, $window){
	'use strict';

	$rootScope.$on('$stateChangeSuccess', function(){

		// hide mobile menu on navigate
		$rootScope.showNavigation = false;

		// log to Google Analytics
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

.factory('defaultInterceptorFactory', ['$rootScope', '$q', '$window', function($rootScope, $q, $window){
	'use strict';

	// cache of debounced event broadcasters
	var broadcasters = {};

	return function(model, idKey){

		// add a new debounced event broadcaster
		if(!broadcasters[model]) broadcasters[model] = _.debounce(function(response, idKey){
			$rootScope.$broadcast(model, idKey ? response[idKey] : null);
		}, 100);

		return {
			response: function(response) {
				broadcasters[model](response, idKey);
				return response.data;
			},
			responseError: function(err) {
				$window.alert(err.data && err.data.message ? err.data.message : 'There was a problem saving your changes.');
				return $q.reject(err);
			}
		};
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

// ### User Resources

.factory('User', ['$resource', 'defaultInterceptorFactory', function($resource, defaultInterceptorFactory){
	'use strict';

	var i = defaultInterceptorFactory('User', 'id');
	return $resource('api/users/:id', {}, {
		delete: {method: 'DELETE', interceptor: i},
		create: {method: 'POST', interceptor: i},
		update: {method: 'PATCH', interceptor: i},
		save: {method: 'PUT', interceptor: i}
	});
}])

// ### Notification Resources

.factory('Notification', ['$resource', 'defaultInterceptorFactory', function($resource, defaultInterceptorFactory){
	'use strict';

	var i = defaultInterceptorFactory('Notification', 'id');
	return $resource('api/notifications/:id', {}, {
		delete: {method: 'DELETE', interceptor: i},
		create: {method: 'POST', interceptor: i},
		update: {method: 'PATCH', interceptor: i},
		save: {method: 'PUT', interceptor: i}
	});
}])

// ###Cycle Resources

.factory('Cycle', ['$resource', 'defaultInterceptorFactory', function($resource, defaultInterceptorFactory){
	'use strict';

	var i = defaultInterceptorFactory('Cycle', 'id');
	return $resource('api/cycles/:id', {}, {
		delete: {method: 'DELETE', interceptor: i},
		create: {method: 'POST', interceptor: i},
		update: {method: 'PATCH', interceptor: i},
		save: {method: 'PUT', interceptor: i}
	});
}])

.factory('Role', ['$resource', 'defaultInterceptorFactory', function($resource, defaultInterceptorFactory){
	'use strict';
	
	var i = defaultInterceptorFactory('Cycle', 'cycle_id');
	return $resource('api/cycles/:cycle/roles/:id', {}, {
		delete: {method: 'DELETE', interceptor: i},
		create: {method: 'POST', interceptor: i},
		update: {method: 'PATCH', interceptor: i},
		save: {method: 'PUT', interceptor: i}
	});
}])

.factory('Status', ['$resource', 'defaultInterceptorFactory', function($resource, defaultInterceptorFactory){
	'use strict';

	var i = defaultInterceptorFactory('Cycle', 'cycle_id');
	return $resource('api/cycles/:cycle/statuses/:id', {}, {
		delete: {method: 'DELETE', interceptor: i},
		create: {method: 'POST', interceptor: i},
		update: {method: 'PATCH', interceptor: i},
		save: {method: 'PUT', interceptor: i}
	});
}])

.factory('Trigger', ['$resource', 'defaultInterceptorFactory', function($resource, defaultInterceptorFactory){
	'use strict';
	
	var i = defaultInterceptorFactory('Cycle', 'cycle_id');
	return $resource('api/cycles/:cycle/triggers/:id', {}, {
		delete: {method: 'DELETE', interceptor: i},
		create: {method: 'POST', interceptor: i},
		update: {method: 'PATCH', interceptor: i},
		save: {method: 'PUT', interceptor: i}
	});
}])

.factory('Stage', ['$resource', 'defaultInterceptorFactory', function($resource, defaultInterceptorFactory){
	'use strict';
	
	var i = defaultInterceptorFactory('Cycle', 'cycle_id');
	return $resource('api/cycles/:cycle/stages/:id', {}, {
		delete: {method: 'DELETE', interceptor: i},
		create: {method: 'POST', interceptor: i},
		update: {method: 'PATCH', interceptor: i},
		save: {method: 'PUT', interceptor: i}
	});
}])

.factory('CycleAssignment', ['$resource', 'defaultInterceptorFactory', function($resource, defaultInterceptorFactory){
	'use strict';
	
	var i = defaultInterceptorFactory('Cycle', 'cycle_id');
	return $resource('api/cycles/:cycle/assignments/:id', {}, {
		delete: {method: 'DELETE', interceptor: i},
		update: {method: 'PATCH', interceptor: i},
		save: {method: 'PUT', interceptor: i}
	});
}])

.factory('CycleInvitation', ['$resource', 'defaultInterceptorFactory', function($resource, defaultInterceptorFactory){
	'use strict';
	
	var i = defaultInterceptorFactory('Cycle', 'cycle_id');
	return $resource('api/cycles/:cycle/invitations/:id', {}, {
		delete: {method: 'DELETE', interceptor: i},
		create: {method: 'POST', interceptor: i},
		update: {method: 'PATCH', interceptor: i},
		save: {method: 'PUT', interceptor: i}
	});
}])

// ###Project Resources

.factory('Project', ['$resource', 'defaultInterceptorFactory', function($resource, defaultInterceptorFactory){
	'use strict';
	
	var i = defaultInterceptorFactory('Project', 'id');
	return $resource('api/projects/:id', {}, {
		delete: {method: 'DELETE', interceptor: i},
		create: {method: 'POST', interceptor: i},
		update: {method: 'PATCH', interceptor: i},
		save: {method: 'PUT', interceptor: i}
	});
}])

.factory('Content', ['$resource', 'defaultInterceptorFactory', function($resource, defaultInterceptorFactory){
	'use strict';
	
	var i = defaultInterceptorFactory('Project', 'project_id');
	return $resource('api/projects/:project/contents/:id', {}, {
		delete: {method: 'DELETE', interceptor: i},
		update: {method: 'PATCH', interceptor: i},
		save: {method: 'PUT', interceptor: i}
	});
}])

.factory('ProjectAssignment', ['$resource', 'defaultInterceptorFactory', function($resource, defaultInterceptorFactory){
	'use strict';
	
	var i = defaultInterceptorFactory('Project', 'project_id');
	return $resource('api/projects/:project/assignments/:id', {}, {
		delete: {method: 'DELETE', interceptor: i},
		update: {method: 'PATCH', interceptor: i},
		save: {method: 'PUT', interceptor: i}
	});
}])

.factory('ProjectInvitation', ['$resource', 'defaultInterceptorFactory', function($resource, defaultInterceptorFactory){
	'use strict';
	
	var i = defaultInterceptorFactory('Project', 'project_id');
	return $resource('api/projects/:project/invitations/:id', {}, {
		delete: {method: 'DELETE', interceptor: i},
		create: {method: 'POST', interceptor: i},
		update: {method: 'PATCH', interceptor: i},
		save: {method: 'PUT', interceptor: i}
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
		request: function(config) {

			// TODO: make sure this is requesting the same domain

			config.headers = config.headers || {};

			if ($window.localStorage.token)
				config.headers.Authorization = 'Bearer ' + $window.localStorage.token;

			return config;
		},
		responseError: function(rejection) {
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
		controller: ['$scope', '$state', 'User', function($scope, $state, User){
			$scope.recovery = {
				password: '',
				password2: ''
			};

			$scope.submit = function(){
				if(!$scope.recovery.password || $scope.recovery.password === '')
					return $windowProvider.alert('You must submit a new password.');

				if($scope.recovery.password !== $scope.recovery.password2)
					return $windowProvider.alert('Your passwords do not match.');

				new User({password: $scope.recovery.password}).$update({id: $scope.currentUser.id}).then(function(user){

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

.filter('title', function() {
	'use strict';

	return function(snake_case) {
		try {
			return snake_case ? snake_case.split('_').map(function(s){ return s.charAt(0).toUpperCase() + s.slice(1); }).join(' ') : '';
		} catch(e) {}
	};
})

.filter('jsonPointer', function() {
	'use strict';

	return function(array) {
		array = Array.isArray(array) ? array : [];
		return '/' + array.map(function(n){ return n.toString().replace(/~/g, '~0').replace(/\//g, '~1'); }).join('/');
	};
})

.filter('access', ['ObjectPath', function(ObjectPath) {
	'use strict';

	return function(base, pointer) {

		// parse pointer
		pointer = typeof pointer === 'string' ? ObjectPath.parse(pointer) : pointer;
		if(!Array.isArray(pointer)) return null;

		// traverse the base
		var cursor = base;
		try {
			pointer.forEach(function(n){ cursor = cursor[n]; });
		} catch(e){ return null; }
		return cursor;
	};
}])

.directive('json', function() {
	'use strict';

	return {
		restrict: 'A',
		require: 'ngModel',
		link: function(scope, element, attrs, ngModel) {

			var lastValid;

			function parse(text) {
				if (!text || text.trim() === '') {
					return {};
				}

				try {
					lastValid = angular.fromJson(text);
					ngModel.$setValidity('invalidJson', true);
				} catch(e) {
					ngModel.$setValidity('invalidJson', false);
				}
				return lastValid;
			}

			function format(object) {
				return angular.toJson(object, true);
			}

			ngModel.$parsers.push(parse);
			ngModel.$formatters.push(format);

			// clear any invalid changes on blur
			element.bind('blur', function () {
				element.val(format(scope.$eval(attrs.ngModel)));
			});

			scope.$watch(attrs.ngModel, function(newValue, oldValue) {
				lastValid = lastValid || newValue;
				if (newValue != oldValue) ngModel.$setViewValue(format(newValue));
			}, true);
		}
	};
})

.directive('jsonPointer', function() {
	'use strict';

	return {
		restrict: 'A',
		require: 'ngModel',
		link: function(scope, element, attrs, ngModel) {

			// parses a json-pointer into an array of parts
			function parse(pointer) {
				if(!pointer) pointer = '/';
				else if(pointer.charAt(0) === '/') pointer = pointer.substring(1);
				return pointer.split(/\//).map(function(n){ return n.replace(/~1/g, '/').replace(/~0/g, '~'); });
			}

			// formats an array of parts into a json-pointer
			function format(array) {
				array = Array.isArray(array) ? array : [];
				return '/' + array.map(function(n){ return n.toString().replace(/~/g, '~0').replace(/\//g, '~1'); }).join('/');
			}

			ngModel.$parsers.push(parse);
			ngModel.$formatters.push(format);
		}
	};
})

.directive('currency', function($filter) {
	'use strict';

	return {
		restrict: 'A',
		require: 'ngModel',
		link: function(scope, element, attrs, ngModel) {

			var lastValid;

			// parses a currency string into a number
			function parse(amount) {
				if(!amount) amount = '0';

				var number = parseFloat(amount.replace(/[$,]+/g, ''), 10);

				// invalid
				if(isNaN(number)) {
					ngModel.$setValidity('invalidJson', false);
					return lastValid;
				}

				ngModel.$setValidity('invalidJson', true);
				return lastValid = number;
			}

			// formats a number as currency
			function format(number) {
				return $filter('currency')(number, '$', 2);
			}

			ngModel.$parsers.push(parse);
			ngModel.$formatters.push(format);

			// clear any invalid changes on blur
			element.bind('blur', function () {
				element.val(format(lastValid));
			});

			scope.$watch(attrs.ngModel, function(newValue, oldValue) {
				lastValid = lastValid || newValue;
				if (newValue != oldValue) ngModel.$setViewValue(format(newValue));
			}, true);
		}
	};
})

.directive('timestamp', function() {
	'use strict';

	return {
		restrict: 'A',
		require: 'ngModel',
		link: function(scope, element, attr, ngModel) {

			function parse(text) {
				return text.getTime() / 1000;
			}

			function format(timestamp) {
				return new Date(timestamp * 1000);
			}

			ngModel.$parsers.push(parse);
			ngModel.$formatters.push(format);
		}
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

.directive('compile', ['$compile', function($compile) {
	'use strict';

	return function(scope, element, attrs) {
		scope.$watch(
			function(scope) {
				return scope.$eval(attrs.compile);
			},
			function(value) {
				element.html(value);
				$compile(element.contents())(scope);
			}
		);
	};
}])

.directive('access', ['$compile', 'ObjectPath', function($compile, ObjectPath) {
	'use strict';
	
	return function(scope, element, attrs) {
		scope.$watch(
			function(scope) {
				return scope.$eval(attrs.access);
			},
			function(path) {
				element.html('<div ng-bind=\"'+scope.$eval(attrs.base)+ObjectPath.stringify(path)+'\"></div>');
				$compile(element.contents())(scope);
			}
		);
	};
}])

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



