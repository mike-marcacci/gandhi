angular.module('gandhi')

.config(['$stateProvider', function($stateProvider) {
	'use strict';

	$stateProvider
		.state('portal', {
			url: '',
			templateUrl: 'portal/index.html',
			abstract: true,
			resolve: {},
			controller: ['$scope', 'Cycle', 'Project', function($scope, Cycle, Project){
				$scope.cycles = Cycle.query({});
				$scope.projects = Project.query({user: $scope.currentUser.id});

				$scope.$on('projects', function(){
					$scope.projects = Project.query({user: $scope.currentUser.id});
				});
			}]
		})
		.state('portal.dashboard', {
			url: '/',
			templateUrl: 'portal/dashboard.html',
			controller: [function(){

				// TODO: implement invitations here??? We should probably make a directive instead.

			}]
		});
}]);
