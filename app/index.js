angular.module('portal', [
	'ui.router',
	'restangular',
	'ngCkeditor' // TODO: somehow allow components to add their own dependencies
])

.config(function($stateProvider, $urlRouterProvider, RestangularProvider) {
	$urlRouterProvider.otherwise("/dashboard");

	RestangularProvider.setBaseUrl('http://localhost:3000/api');
	RestangularProvider.addFullRequestInterceptor(function(element, operation, route, url, headers, params, httpConfig) {  
		return {
			element: element,
			params: params,
			headers: headers, // TODO: put JWT here
			httpConfig: httpConfig
		};
	});

})
.run(function($rootScope, Restangular) {

	// TODO: this comes from sessionStorage
	$rootScope.userId = 'a5901ab6-bf17-49cd-981d-c25875aec8e9';

	Restangular.one("users", $rootScope.userId).get().then(function(user){
		$rootScope.user = user;
	})

	$rootScope.logout = function(){
		alert("Logged Out...");
	}

})

.controller('navigation', function($scope, Restangular, $q) {

	$scope.nav = {};

	$q.all([
		Restangular.all('programs').getList(),
		Restangular.one('users', $scope.userId).all('projects').getList()
	]).then(function(res){

		// add programs to nav
		res[0].forEach(function(program){
			$scope.nav[program.id] = {
				id: program.id,
				title: program.title,
				projects: {}
			}
		});

		// map user's projects to corresponding program in nav
		res[1].forEach(function(project){
			$scope.nav[project.program_id].projects[project.id] = {
				id: project.id,
				title: project.title,
				flow: project.flow
			};
		});

	// TODO: hide other ones
	});

})

