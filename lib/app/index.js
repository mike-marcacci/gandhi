// set up global dependencies
ace.config.set("basePath", "assets/bower/ace-builds/src-min-noconflict/");
// CKEDITOR.basePath = 'assets/ckeditor/';
CKEDITOR.plugins.basePath = 'assets/ckeditor/plugins/';

// declare the module
angular.module('gandhi')

.config(function(uiSelectConfig) {
  uiSelectConfig.theme = 'bootstrap';
})

.config(function($stateProvider, $urlRouterProvider, RestangularProvider) {
	$urlRouterProvider.otherwise("/");
})

.config(function(RestangularProvider) {
	// RestangularConfigurer.setFullResponse(true);
	RestangularProvider.setBaseUrl('api');
	RestangularProvider.addFullRequestInterceptor(function(element, operation, route, url, headers, params, httpConfig) {
		return {
			element: element,
			params: params,
			headers: headers, // TODO: put JWT here
			httpConfig: httpConfig
		};
	});
})

.config(function($httpProvider) {
	$httpProvider.interceptors.push('authInterceptor');
})

// add the ckeditor decorator
.config(['schemaFormDecoratorsProvider', function(decoratorsProvider){
	decoratorsProvider.addMapping('bootstrapDecorator', 'ckeditor', 'decorators/ckeditor.html');
}])

// add the upload decorator
.config(['schemaFormDecoratorsProvider', function(decoratorsProvider){
	decoratorsProvider.addMapping('bootstrapDecorator', 'upload', 'decorators/upload.html');
}])

.factory('auth', function($rootScope, Restangular, $window, $q){

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
		while (output.length % 4 > 0){ output += "=" };

		var parsed = JSON.parse(window.atob(output));

		return Restangular.one("users", parsed.sub).get().then(function(user){
			return $rootScope.currentUser = user;
		}, function(err){
			logout();
			return $q.reject(err);
		});
	}

	function login(data) {
		if(!data || !data.email)
			return $q.reject(new Error('Email is required'));

		return Restangular.service('tokens').post(data).then(function(result){
			return setUser(result.token);
		});
	}

	function signup(data){
		if(!data || !data.email)
			return $q.reject(new Error('Email is required'));

		if(!data.password)
			return $q.reject(new Error('Password is required'));

		return Restangular.service('users').post(data).then(login, $q.reject);
	}

	function recover(data) {
		if(!data || !data.email)
			return $q.reject(new Error('Email is required'));

		return Restangular.service('tokens').post({email: data.email});
	}

	function validate(){
		// check for token
		if(!$window.localStorage.token)
			return logout();

		var output = $window.localStorage.token.split('.')[1].replace('-', '+').replace('_', '/');
		while (output.length % 4 > 0){ output += "=" };

		// check JSON format
		try { var parsed = JSON.parse(window.atob(output)); }
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
	}
})

.factory('authInterceptor', function ($rootScope, $window, $q) {
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
})

// the upload directive
.directive('sfUpload', function(){
	return {
		template: ''
			+'<div ng-hide="model" class="form-control">'
			+'	<input ng-hide="inProgress > 0" type="file" ng-file-select="upload($files)">'
			+'	<div ng-show="inProgress" class="progress">'
			+'	  <div class="progress-bar progress-bar-striped active" role="progressbar" style="width: 100%"></div>'
			+'	</div>'
			+'</div>'
			+'<div ng-show="model">'
			+'  <div class="btn btn-default" ng-click="download()">Download</div>'
			+'  <div class="btn btn-danger" ng-click="remove()"><i class="glyphicon glyphicon-trash"></i> Remove File</div>'
			+'</div>',
		restrict: 'A',
		require: 'ngModel',
		scope: {
			model: '=ngModel'
		},
		controller: function($scope, $upload, $window){
			$scope.inProgress = false;

			$scope.upload = function($files) {
				$scope.inProgress = true;
				$upload.upload({
					url: 'api/files',
					method: 'POST',
					data: {},
					file: $files,
				}).success(function(data, status, headers, config) {
					$scope.inProgress = false;
					$scope.model = data[0].id;
				})
				.error(function(err){
					$scope.inProgress = false;
					alert('There was an issue uploading your file. Please try again.');
				})
			};

			$scope.remove = function(){
				$scope.model = null;
			}

			$scope.download = function(){
				$window.open('api/files/' + $scope.model);
			}
		}
	}
})

.controller('loginController', function($scope, $location, auth, $state){
	var recovery_token, email;
	if( (recovery_token = $location.search().recovery_token) ) {
		while (recovery_token.length % 4 > 0){ recovery_token += "=" };
		if( (email = JSON.parse(atob(recovery_token)).email) ){
			auth.login({
				email: email,
				recovery_token: recovery_token
			}).then(function(res){}, function(err){
				if(err.data && err.data.message)
					alert(err.data.message);
				else
					alert('Unable to recover your account. Please try again.');
				
				// chances are they're on the recovery page; let's get them out of here
				$state.go('portal.dashboard');
			})
		} else {
			alert('Invalid recovery token.');
		}

		$location.search('recovery_token', null);
	}



	$scope.tab = {
		login: true,
		signup: false
	};
	$scope.selectTab = function(tab){
		$scope.tab.login = (tab == 'login');
		$scope.tab.signup = (tab == 'signup');
	}


	// TODO: move to its own controller
	$scope.login = {
		email: '',
		password: '',
		submit: function(recover){
			if(!this.email || !this.password)
				return alert('Your email and password are required to log in.');

			auth.login({email: this.email, password: this.password})
				.then(function(data){
					$scope.login.reset();
				}, function(err){
					$scope.login.reset();
					if(err.data && err.data.message)
						alert(err.data.message);
					else
						alert('Unable to log in. Please try again.');
				})
		},
		recover: function(recover){
			if(!this.email)
				return alert('Your email is required to recover your account.');

			auth.recover({email: this.email})
				.then(function(data){
					alert('You have been sent an email with a recovery link.');
				}, function(err){
					if(err.data && err.data.message)
						alert(err.data.message);
					else
						alert('Unable to recover your account. Please try again.');
				})
		},
		reset: function(){
			this.password = '';
		}
	}

	// TODO: move to its own controller
	$scope.signup = {
		name: '',
		email: '',
		password: '',
		password2: '',
		submit: function(){
			if(this.password != this.password2)
				return alert('Passwords must match.');

			auth.signup({name: this.name, email: this.email, password: this.password})
				.then(function(data){
					$scope.signup.reset();
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
})

.run(function($rootScope, auth, $state, $stateParams) {
	$rootScope.$state = $state;
	$rootScope.$stateParams = $stateParams;
	$rootScope.logout = auth.logout;

	// validate the current user
	$rootScope.$on('$stateChangeSuccess', function () {
		auth.validate();
	})
});