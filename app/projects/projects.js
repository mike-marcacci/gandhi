angular.module('portal')

.config(function($stateProvider, $urlRouterProvider, RestangularProvider) {

	$stateProvider
		.state('portal.apply', {
			url: '/apply/:program',
			templateUrl: 'app/projects/apply.html',
			resolve: {
				program: function(Restangular, $stateParams){
					return Restangular.one('programs', $stateParams.program).get();
				}
			},
			controller: function ($scope, $state, $stateParams) {
				$scope.$watchCollection('programs', function(programs, old) {
					if(!programs) return;

					programs.get($stateParams.program).then(function(program){
						$scope.program = program;
						$scope.stage = program.flow.root;

						var component = program.flow.stages[$scope.stage].component;
						$scope.component = 'components/'+component+'/'+component+'.html';
					})
				})
			}
		})

		.state('portal.projects', {
			url: '/projects/:project',
			templateUrl: 'app/projects/projects.html',
			abstract: true,
			resolve: {},
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
					})
				});

				$scope.getClass = function(stageId){
					return '';
				}
			}
		})

		.state('portal.projects.stage', {
			url: '/stage/:stage',
			template: '<ng-include src="component"></ng-include>',
			controller: function($scope, $stateParams){
				$scope.stage = $stateParams.stage;

				$scope.$watchCollection('[project, program]', function(newValues, oldValues) {
					if(!newValues[0] || !newValues[1]) return;

					var project = newValues[0];
					var program = newValues[1];

					var component = program.flow.stages[$scope.stage].component;
					$scope.component = 'components/'+component+'/'+component+'.html';
				});
			}
		})
		
})