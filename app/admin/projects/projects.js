angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('admin.projects', {
			url: "/projects",
			templateUrl: "admin/projects/projects.html",
			controller: function($scope, Restangular){
				$scope.projects = Restangular.all('projects').getList().$object;
			}
		})

});