angular.module('gandhi')

.config(['$stateProvider', function($stateProvider) {
	$stateProvider
		.state('portal', {
			url: "",
			templateUrl: "portal/index.html",
			abstract: true,
			resolve: {},
			controller: ['$scope', 'Project', function($scope, Project){
				$scope.projects = Project.query({user: $scope.currentUser.id});
			}]
		})
		.state('portal.dashboard', {
			url: "/",
			templateUrl: "portal/dashboard.html",
			controller: ['$scope', function($scope){

				// TODO: implement invitations here??? We should probably make a directive instead.

			}]
		})
}]);