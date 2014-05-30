angular.module('gandhi')

.config(function($stateProvider, $urlRouterProvider, RestangularProvider) {

	$stateProvider
		.state('portal.start', {
			url: '/start/:cycle',
			templateUrl: 'portal/projects/start.html',
			resolve: {},
			controller: function ($scope, $state, $stateParams) {
				$scope.$watchCollection('cycles', function(cycles, old) {
					if(!cycles) return;

					cycles.get($stateParams.cycle).then(function(cycle){
						$scope.cycle = cycle;
						$scope.stage = cycle.flow.root;

						var component = cycle.flow.stages[$scope.stage].component.name;
						$scope.component = 'components/'+component+'/portal/index.html';
					})
				})
			}
		})

		.state('portal.projects', {
			url: '/projects/:project',
			templateUrl: 'portal/projects/index.html',
			abstract: true,
			controller: function ($scope, $state, $stateParams) {
				$scope.$watchCollection('[projects, cycles]', function(newValues, oldValues) {
					if(!newValues[0] || !newValues[1]) return;

					var projects = newValues[0];
					var cycles = newValues[1];

					// get the correct project
					$scope.$watchCollection('projects', function(newValue, oldValue){
						$scope.projects.some(function(project){
							if(project.id != $stateParams.project)
								return false;

							return $scope.project = project;
						});

						// get the correct cycle
						if($scope.project)
							cycles.get($scope.project.cycle_id).then(function(cycle){
								$scope.cycle = cycle;

								// decide the user's role in this project
								if($scope.project.users[$scope.currentUser.id])
									$scope.role = $scope.project.users[$scope.currentUser.id].role;
								else
									$scope.role = $scope.cycle.users[$scope.currentUser.id].role;
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

				function testProject(project, tests){
					return tests.some(function(set){
						return set.every(function(test){
							// date
							if(test.name == 'date' && (new Date(test.options.date)) >= (new Date()))
								return true;

							// submission
							if(test.name == 'status' && project.flow.stages[test.options.stage] && project.flow.stages[test.options.stage].status == test.options.status)
								return true;
						});
					});
				}

				$scope.$watch('[project, cycle]', function(newValues, oldValues) {
					if(!newValues[0] || !newValues[1]) return;

					var project = newValues[0];
					var cycle = newValues[1];

					var stageProject = project.flow.stages[$stateParams.stage];
					var stageCycle = cycle.flow.stages[$stateParams.stage];

					// decide if the stage is open or closed
					$scope.lock = -1;

					// OPEN
					if(!stageCycle.open || !stageCycle.open.length || testProject(project, stageCycle.open))
						$scope.lock = 0;

					// CLOSE
					if(stageCycle.close && stageCycle.close.length && testProject(project, stageCycle.close))
						$scope.lock = 1;

					$scope.component = 'components/'+stageCycle.component.name+'/portal/index.html';
				}, true);
			}
		})
		
})