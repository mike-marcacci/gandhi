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

						var component = program.flow.stages[$scope.stage].component.name;
						$scope.component = 'portal/components/'+component+'/index.html';
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
					$scope.$watchCollection('projects', function(newValue, oldValue){
						$scope.projects.some(function(project){
							if(project.id != $stateParams.project)
								return false;

							return $scope.project = project;
						});

						// get the correct program
						if($scope.project)
							programs.get($scope.project.program_id).then(function(program){
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
				$scope.open = false;

				function testStage(stage, tests){
					return tests.some(function(set){
						if(typeof set == 'array' && set.every(function(test){
							// date
							if(test.name == 'date' && (new Date(test.options.date)) >= (new Date()))
								return true;

							// submission
							if(test.name == 'submission' && stage.flow.stages[test.options.stage].submitted)
								return true;
						})) {
							return true;
						}
					});
				}

				$scope.$watch('[project, program]', function(newValues, oldValues) {
					if(!newValues[0] || !newValues[1]) return;

					var project = newValues[0];
					var program = newValues[1];

					var stageProject = project.flow.stages[$stateParams.stage];
					var stageProgram = program.flow.stages[$stateParams.stage];

					// OPEN
					if(!stageProgram.open || !stageProgram.open.length || testStage(stageProgram.open, stageProject))
						$scope.open = true;

					// CLOSE
					if(stageProgram.close && stageProgram.close.length && testStage(stageProgram.close, stageProject))
						$scope.open = false;

					$scope.component = 'portal/components/'+stageProgram.component.name+'/index.html';
				}, true);
			}
		})
		
})