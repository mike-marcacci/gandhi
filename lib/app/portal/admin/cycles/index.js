angular.module('gandhi')

.config(function($stateProvider) {
	'use strict';

	$stateProvider

	.state('portal.admin.cycles', {
		url: '/cycles',
		abstract: true,
		template: '<div ui-view></div>',
		controller: ['$scope', 'Cycle', function($scope, Cycle){
			$scope.table = {
				query: {
					sort: [{path: ['title'], direction: 'asc'}]
				},
				pages: {},
				columns: [
					{primary: true, title: 'Title', path: ['title']},
					{primary: true, title: 'Status', path: ['status']},
					{primary: false, title: 'Created', path: ['created'], template: '<td>{{row.created * 1000 | date:"yyyy.MM.dd - hh:mm a"}}</td>'},
					{primary: false, title: 'Updated', path: ['updated'], template: '<td>{{row.updated * 1000 | date:"yyyy.MM.dd - hh:mm a"}}</td>'}
				]
			};

			function getList(query){
				$scope.cycles = $scope.table.data = Cycle.query(query || $scope.table.query, function(cycles, h){
					$scope.table.pages = JSON.parse(h('pages'));
				});
			}

			$scope.$on('cycles', function(){ getList(); });
			$scope.$watch('table.query', getList, true);
		}]
	})

	.state('portal.admin.cycles.list', {
		url: '',
		templateUrl: 'portal/admin/cycles/list.html'
	})

	.state('portal.admin.cycles.create', {
		url: '/create',
		templateUrl: 'portal/admin/cycles/create.html',
		controller: ['$scope', '$rootScope', '$state', 'Cycle', function($scope, $rootScope, $state, Cycle){

			// the model to edit
			$scope.cycleCreate = new Cycle();

			// save
			$scope.create = function() {
				$scope.cycleCreate.$create().then(function(cycle) {

					// update the local lists
					$rootScope.$broadcast('cycles', cycle.id);

					// redirect
					$state.go('portal.admin.cycles.show', {
						cycle: cycle.id
					});

				}, function(err) {
					if (err.data && err.data.message)
						$window.alert(err.data.message);
					else
						$window.alert('There was a problem saving your changes.');
				});
			};

		}]
	})

	.state('portal.admin.cycles.show', {
		url: '/show/:cycle',
		templateUrl: 'portal/admin/cycles/show.html',
		controller: ['$scope', '$rootScope', '$state', '$stateParams', '$window', 'Cycle', function($scope, $rootScope, $state, $stateParams, $window, Cycle){
			$scope.edit = false;
			$scope.toggleEdit = function(){
				$scope.edit = !$scope.edit;
			};

			$scope.source = false;
			$scope.toggleSource = function(){
				$scope.source = !$scope.source;
			};

			function getObject(){
				if(!$stateParams.cycle)
					return;

				// get the cycle
				Cycle.get({id: $stateParams.cycle}).$promise.then(function(cycle){
					$scope.cycle = cycle;
					$scope.cycleEdit = new Cycle(cycle);
					$scope.cycleSource = JSON.stringify(cycle, null, '\t');
				});
			}

			getObject();
			$scope.$on('cycles', getObject);

			// replace the cycle
			$scope.replace = function(){
				var value;

				// parse the string
				try {
					value = JSON.parse($scope.cycleSource);
				} catch (e){
					return $window.alert('There\'s an error in your JSON syntax.');
				}

				$scope.cycle.customPUT(value).then(function(){

					// update the local lists
					$rootScope.$broadcast('cycles');

					// redirect
					$scope.source = false;

				}, function(err){
					if(err.data && err.data.message)
						$window.alert(err.data.message);
					else
						$window.alert('There was a problem saving your changes.');
				})
			}

			// update the cycle
			$scope.update = function(){
				$scope.cycleEdit.$update({id: $scope.cycle.id}).then(function(cycle){

					// broadcast update event
					$rootScope.$broadcast('cycles', cycle.id);

					// redirect
					$scope.edit = false;

				}, function(err){
					if(err.data && err.data.message)
						$window.alert(err.data.message);
					else
						$window.alert("There was a problem saving your changes.");
				})
			}


			// delete the cycle
			$scope.destroy = function(){
				if(!$window.confirm("Are you sure you want to delete this cycle?"))
					return;

				$scope.cycle.$delete({id: $scope.cycle.id}).then(function(cycle){

					// update the local lists
					$rootScope.$broadcast('cycles', cycle.id);

					// redirect
					$state.go('portal.admin.cycles.list');

				}, function(err){
					if(err.data && err.data.message)
						$window.alert(err.data.message);
					else
						$window.alert("There was a problem performing the delete.");
				})
			}
		}]
	})

	.state('portal.admin.cycles.show.roles', {
		url: '/users',
		templateUrl: "portal/admin/cycles/show.roles.html",
		controller: ['$scope', '$state', '$stateParams', 'Cycle', function($scope, $state, $stateParams, Cycle) {
		
		}]
	})

	.state('portal.admin.cycles.show.flow', {
		url: '/flow',
		templateUrl: 'portal/admin/cycles/show.flow.html',
		abstract: true,
		controller: function ($scope, $state, $stateParams, Restangular, $rootScope) {
			$scope.edit = false;
			$scope.toggleEdit = function(){
				$scope.edit = !$scope.edit;
			};

			$scope.updateStage = function(){
				if(!$scope.stageEdit || !$scope.cycle)
					return $window.alert('Unable to save.');

				return $window.alert('There\'s a bug in this, so it is temporarily disabled');

				// don't update the stage's component options
				delete $scope.stageEdit.component.options;

				var data = {flow: {}}; data.flow[$scope.stage] = $scope.stageEdit;

				$scope.cycle.patch(data).then(function(res){

					// update the local lists
					$rootScope.$broadcast('cycles');

					// redirect
					$scope.edit = false;

				}, function(err){
					if(err.data && err.data.message)
						$window.alert(err.data.message);
					else
						$window.alert("There was a problem saving your changes.");
				});
			}

			// options for the waterfall chart
			$scope.waterfallOptions = {
				hide: false,
				node: {
					width: 160,
					height: 26,
					margin: {
						x: 10,
						y: 5
					},
					onclick: function(stage){
						$state.go('portal.admin.cycles.show.flow.stage', {stage: stage.id});
					}
				}
			};

			// build the flow object
			$scope.$watch('cycle', function(cycle){
				if(!cycle)
					return;

				$scope.stage = $scope.stage || cycle.defaults.flow;
				$scope.stageEdit = angular.copy(cycle.flow[$scope.stage]);

				$scope.flow = {};
				_.each(cycle.flow, function(stage, id){
					$scope.flow[id] = {
						id: stage.id,
						title: stage.title,
						class: stage.id === $scope.stage ? 'active' : '', // TODO: apply other classes
						next: stage.next,
						visible: true
					}
				});
			});
		}
	})

	.state('portal.admin.cycles.show.flow.stage', {
		url: '/:stage',
		template: '<div gandhi-component="{cycle: cycle, project: project, stage: stage, role: role, mode: \'admin\'}"></div>',
		controller: function ($scope, $state, $stateParams, Restangular) {
			$scope.$parent.stage = $stateParams.stage;

			// activate the correct stage
			_.each($scope.flow, function(stage, id){
				stage.class = id === $scope.stage ? 'active' : ''
			});
		}
	})

	.state('portal.admin.cycles.show.users', {
		url: '/users',
		templateUrl: "portal/admin/cycles/show.users.html",
		controller: function ($scope, $state, $stateParams, Restangular) {

		}
	})

});
