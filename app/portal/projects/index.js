angular.module('gandhi')

.config(function($stateProvider, $urlRouterProvider, RestangularProvider) {

	$stateProvider
		.state('portal.start', {
			url: '/start/:program',
			templateUrl: 'portal/projects/start.html',
			resolve: {},
			controller: function ($scope, $state, $stateParams) {
				$scope.$watchCollection('programs', function(programs, old) {
					if(!programs) return;

					programs.get($stateParams.program).then(function(program){
						$scope.program = program;
						$scope.stage = program.flow.root;

						var component = program.flow.stages[$scope.stage].component;
						$scope.component = 'portal/components/'+component+'/'+component+'.html';
					})
				})
			}
		})

		.state('portal.projects', {
			url: '/projects/:project',
			templateUrl: 'portal/projects/index.html',
			abstract: true,
			controller: function ($scope, $state, $stateParams) {
				$scope.$watchCollection('[projects, programs]', function(newValues, oldValues) {
					if(!newValues[0] || !newValues[1]) return;

					var projects = newValues[0];
					var programs = newValues[1];

					// get the correct project
					projects.get($stateParams.project).then(function(project){
						$scope.project = project;

						// get the correct program
						programs.get(project.program_id).then(function(program){
							$scope.program = program;
						});
					});
				});
			}
		})

		.state('portal.projects.stage', {
			url: '/:stage',
			template: '<ng-include src="component"></ng-include>',
			controller: function($scope, $stateParams){
				$scope.stage = $stateParams.stage;

				$scope.$watchCollection('[project, program]', function(newValues, oldValues) {
					if(!newValues[0] || !newValues[1]) return;

					var project = newValues[0];
					var program = newValues[1];

					var component = program.flow.stages[$scope.stage].component;
					$scope.component = 'portal/components/'+component+'/index.html';
				});
			}
		})
		
})