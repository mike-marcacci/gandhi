angular.module('gandhi')

.config(function($stateProvider, $urlRouterProvider, RestangularProvider) {

	$stateProvider

		.state('portal.projects', {
			url: '/projects',
			template: '<div ui-view></div>',
			abstract: true,
			controller: function ($scope, $state, $stateParams) {
				$scope.query = {};
				$scope.projects = null;

				$scope.currentUser.getList('projects').then(function(res){
					$scope.projects = res.data;

					// if we have no projects to show, create a new one!
					if($scope.projects && $scope.projects.length === 0)
						$state.go('portal.projects.new');
				});

				$scope.$on('projects', function(){
					$scope.projects.getList().then(function(res){
						$scope.projects = res.data;
					});
				});
			}
		})

		.state('portal.projects.list', {
			url: '',
			templateUrl: 'portal/projects/list.html',
			controller: function ($scope, $state, $stateParams) {

			}
		})

		.state('portal.projects.show', {
			url: '/show/:project',
			templateUrl: 'portal/projects/show.html',
			controller: function ($scope, $state, $stateParams, Restangular, waterfall) {
				$scope.project = null;
				$scope.cycle = null;
				$scope.stage = null;

				function getProject(){
					Restangular.all('projects').get($stateParams.project).then(function(res){
						$scope.project = res.data;
						$scope.role = $scope.project.users[$scope.currentUser.id] ? $scope.project.users[$scope.currentUser.id].role : null;
						Restangular.all('cycles').get($scope.project.cycle_id).then(function(res){
							if(!res.data) return;
							$scope.cycle = res.data;
							$scope.role = $scope.role || ($scope.cycle.users[$scope.currentUser.id] ? $scope.cycle.users[$scope.currentUser.id].role : null);
							$scope.stage = $scope.stage || $scope.cycle.defaults.flow;

							// build the index of stages
							$scope.index = {};
							_.each($scope.cycle.flow, function(stage, id){
								$scope.index[id] = {
									id: stage.id,
									title: stage.title,
									class: stage.id === $scope.stage ? 'active' : '', // TODO: apply other classes
									next: stage.next,
									visible: $scope.project.flow[id].visible
								}
							});

							// sort stages for pill layout 
							$scope.ordered = _.sortBy(waterfall($scope.index), 'scoreUp');

							// update active flag
							$scope.$watch('stage', function(stage){
								for(var id in $scope.index) {
									$scope.index[id].class = (id === stage ? 'active' : '');
								}
							});

							$scope.waterfallOptions = {
								node: {
									onclick: function(stage){
										$state.go('portal.projects.show.flow', {stage: stage.id});
									}
								}
							}
						});
					});
				}

				$scope.$on('projects', getProject);
				getProject();
			}
		})

		.state('portal.projects.show.flow', {
			url: '/:stage',
			template: '<div gandhi-component="{cycle: cycle, project: project, stage: stage, role: role, mode: \'default\'}"></div>',
			controller: function ($scope, $state, $stateParams, Restangular) {
				$scope.$parent.stage = $stateParams.stage;
			}
		})

		.state('portal.projects.new', {
			url: '/create',
			templateUrl: 'portal/projects/new.html',
			controller: function ($scope, $state, $stateParams) {

			}
		})

		.state('portal.projects.create', {
			url: '/create/:cycle',
			templateUrl: 'portal/projects/create.html',
			controller: function ($scope, $state, $stateParams, Restangular, waterfall) {
				$scope.cycle = null;
				Restangular.all('cycles').get($stateParams.cycle).then(function(res){
					$scope.cycle = res.data;
					$scope.stage = $scope.cycle.defaults.flow;
					$scope.role = $scope.cycle.defaults.role;

					// build the index of stages
					$scope.index = {};
					_.each($scope.cycle.flow, function(stage, id){
						$scope.index[id] = {
							id: stage.id,
							title: stage.title,
							class: stage.id === $scope.stage ? 'active' : '', // TODO: apply other classes
							next: stage.next,
							visible: id == $scope.cycle.defaults.flow
						}
					});

					// sort stages for pill layout 
					$scope.ordered = _.sortBy(waterfall($scope.index), 'scoreUp');
				})
			}
		})

})
