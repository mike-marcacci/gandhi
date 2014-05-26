angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('admin.projects', {
			url: "/projects",
			templateUrl: "admin/projects/index.html",
			controller: function($scope, Restangular){
				$scope.projects = Restangular.all('projects').getList().$object;
			}
		})

		.state('admin.projects.show', {
			url: "/:project",
			templateUrl: "admin/projects/show.html",
			controller: function($scope, Restangular, $stateParams){
				$scope.project = Restangular.one('projects', $stateParams.project).get().$object;
			}
		})

});