angular.module('portal')

.config(function($stateProvider, $urlRouterProvider, RestangularProvider) {

	$stateProvider
		.state('apply', {
			url: '/apply/:program',
			templateUrl: 'app/projects/apply.html',
			resolve: {
				program: function(Restangular, $stateParams){
					return Restangular.one('programs', $stateParams.program).get();
				}
			},
			controller: function ($scope, $state, program) {
				$scope.program = program;
				$scope.stage = program.flow.stages[program.flow.root];
			}
		})

		.state('projects', {
			url: '/projects/:project',
			templateUrl: 'app/projects/projects.html',
			abstract: true,
			resolve: {
				project: function(Restangular, $stateParams){
					return Restangular.one('projects', $stateParams.project).get();
				},
				program: function(Restangular, $stateParams){
					return Restangular.one('projects', $stateParams.project).get().then(function(project){
						return Restangular.one('programs', project.program_id).get();
					})
				}
			},
			controller: function ($scope, $state, program, project) {
				$scope.program = program;
				$scope.project = project;

				$scope.getClass = function(stageId){
					return '';
				}
			}
		})

		.state('projects.stage', {
			url: '/stage/:stage',
			template: '<ng-include src="\'components/\'+component+\'/\'+component+\'.html\'"></ng-include>',
			controller: function($scope, $stateParams){
				$scope.stage = $stateParams.stage;
				$scope.component = $scope.program.flow.stages[$stateParams.stage].component;
			}
		})
		
})