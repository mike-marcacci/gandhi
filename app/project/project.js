angular.module('portal.projects', [
	'ui.router'
])

.config(['$stateProvider', '$urlRouterProvider', 'RestangularProvider', function($stateProvider, $urlRouterProvider, RestangularProvider) {

	$stateProvider
		.state('projects', {x
			url: '/projects/:projectId',
			templateUrl: 'app/projects/projects.html',
			resolve: {
				project: ['Restangular','$stateParams', function(Restangular, $stateParams){
					return Restangular.one('projects', $stateParams.projectId).get();
				}]
			},
			controller: ['$scope', '$state', 'project', function ( $scope, $state, contacts) {
				$scope.project = project;
			}]
		})

		.state('projects.stage', {
			url: '/stage/:stageId',
			resolve: {
				project: ['Restangular','$stateParams', function(Restangular, $stateParams){
					return Restangular.one('projects', $stateParams.projectId).get();
				}]
			},
			templateProvider: ['$stateParams', function($stateParams){
				// TODO: somehow get the stage data from the project to find `stageComponentName`
				return '<stageComponentName project="project" stageId="'+$stateParams+'"></stageComponentName>'
			}]
		})

])