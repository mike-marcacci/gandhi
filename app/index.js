angular.module('portal', [
	// 'portal.dashboard',
	'ui.router',
	'restangular'
])


.config(['$stateProvider', '$urlRouterProvider', 'RestangularProvider', function($stateProvider, $urlRouterProvider, RestangularProvider) {
	$urlRouterProvider.otherwise("/dashboard");

	$stateProvider
		.state('dashboard', {
			url: "/dashboard",
			templateUrl: "app/dashboard/dashboard.html"
		})
		.state('dashboard.alerts', {
			url: "/alerts",
			templateUrl: "app/dashboard/dashboard.alerts.html",
			controller: function($scope) {
				$scope.alerts = ["A", "List", "Of", "Items"];
			}
		})
		.state('user', {
			url: "/user",
			templateUrl: "app/user/user.html"
		})


	RestangularProvider.setBaseUrl('/api');
	RestangularProvider.addFullRequestInterceptor(function(element, operation, route, url, headers, params, httpConfig) {  
	  return {
	    element: element,
	    params: params,
	    headers: headers, // TODO: put JWT here
	    httpConfig: httpConfig
	  };
	});


	}
])

.factory('user', ['$q', function($q){
	var deferred = $q.defer();
	deferred.resolve({"id": "a5901ab6-bf17-49cd-981d-c25875aec8e9"})
	return deferred.promise;
}])

.factory('programs',['$http', function($http){
	return $http({method: 'GET', url: '/fixtures/programs.json'});
}])


.factory('projects',['$http', function($http){
	return $http({method: 'GET', url: '/fixtures/projects.json'});
}])


.controller('navigation', ['$scope', 'user', 'programs', 'projects', '$q', function($scope, user, programs, projects, $q) {
	$scope.programs = {};
	$q.all([programs, projects]).then(function(args){
		var programs = args[0];
		var projects = args[1];

		programs.data.forEach(function(program){
			$scope.programs[program.id] = program;
			$scope.programs[program.id].projects = {};
		});

		projects.data.forEach(function(project){
			$scope.programs[project.program_id].projects[project.id] = project;
		});
	})

	$scope.user = [];
	user.then(function(u){
		$scope.user = u;
	})
}])