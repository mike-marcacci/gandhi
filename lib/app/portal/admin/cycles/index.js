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
		controller: ['$scope', '$rootScope', '$state', '$window', 'Cycle', function($scope, $rootScope, $state, $window, Cycle){

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
		controller: ['$scope', '$rootScope', '$state', '$stateParams', '$window', 'Cycle', 'Role', 'Status', function($scope, $rootScope, $state, $stateParams, $window, Cycle, Role, Status){
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

				// get cycle roles
				Role.query({cycle: $stateParams.cycle}).$promise.then(function(roles){
					$scope.roles = roles;
					$scope.rolesById = _.indexBy(roles, 'id');
				})

				// get cycle statuses
				Status.query({cycle: $stateParams.cycle}).$promise.then(function(statuses){
					$scope.statuses = statuses;
					$scope.statusesById = _.indexBy(statuses, 'id');
				})

				// TODO: get cycle stages
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
				});
			};

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
						$window.alert('There was a problem saving your changes.');
				});
			};


			// delete the cycle
			$scope.destroy = function(){
				if(!$window.confirm('Are you sure you want to delete this cycle?'))
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
						$window.alert('There was a problem performing the delete.');
				});
			};
		}]
	})

	.state('portal.admin.cycles.show.roles', {
		url: '/roles',
		templateUrl: 'portal/admin/cycles/show.roles.html',
		controller: ['$scope', '$rootScope', '$state', '$stateParams', '$window', 'Role', function($scope, $rootScope, $state, $stateParams, $window, Role) {
			$scope.roles = [];
			
			$scope.roleCreate = null;
			$scope.toggleCreate = function(status) {
				$scope.roleCreate = $scope.roleCreate ? null : new Role();
			};

			$scope.backup = {};
			$scope.toggleEdit = function(role) {
				if(!$scope.backup[role.id])
					return $scope.backup[role.id] = angular.copy(role);

				// revert to backup
				angular.extend(role, $scope.backup[role.id]);
				delete $scope.backup[role.id];
			};

			function getRoles(cycle){
				cycle = cycle || $scope.cycle; if(!cycle) return;
				$scope.roles = Role.query({cycle: cycle.id})
				$scope.backup = {};
			}

			$scope.$on('cycles', function(){ getRoles(); });
			$scope.$watch('cycle', getRoles, true);


			$scope.save = function(role) {
				if(!role) return $window.alert('No role specified.');
				role.$save({cycle: $scope.cycle.id, id: role.id}).then(function(role){

					// broadcast update event
					$rootScope.$broadcast('cycles', $scope.cycle.id);

				}, function(err){
					if(err.data && err.data.message)
						$window.alert(err.data.message);
					else
						$window.alert('There was a problem saving your changes.');
				});
			};

			$scope.update = function(role) {
				if(!role) return $window.alert('No role specified.');
				role.$update({cycle: $scope.cycle.id, id: role.id}).then(function(role){

					// broadcast update event
					$rootScope.$broadcast('cycles', $scope.cycle.id);
					
				}, function(err){
					if(err.data && err.data.message)
						$window.alert(err.data.message);
					else
						$window.alert('There was a problem saving your changes.');
				});
			};

			$scope.delete = function(role) {
				if(!role) return $window.alert('No role specified.');
				if(!$window.confirm('Are you sure you want to delete this role?')) return;
				role.$delete({cycle: $scope.cycle.id, id: role.id}).then(function(role){

					// broadcast update event
					$rootScope.$broadcast('cycles', $scope.cycle.id);
					
				}, function(err){
					if(err.data && err.data.message)
						$window.alert(err.data.message);
					else
						$window.alert('There was a problem saving your changes.');
				});
			};

			$scope.create = function() {
				if(!$scope.roleCreate.id || !$scope.roleCreate.id.length)
					return $window.alert('An ID must be set.');

				// Set empty assignable and visible
				$scope.roleCreate.assignable = {};
				$scope.roleCreate.visible = {};

				$scope.roleCreate.$save({cycle: $scope.cycle.id, id: $scope.roleCreate.id}).then(function(role){

					// clear the form
					$scope.roleCreate = null;

					// broadcast update event
					$rootScope.$broadcast('cycles', $scope.cycle.id);

				}, function(err){
					if(err.data && err.data.message)
						$window.alert(err.data.message);
					else
						$window.alert('There was a problem saving your changes.');
				});
			};
		}]
	})

	.state('portal.admin.cycles.show.statuses', {
		url: '/statuses',
		templateUrl: 'portal/admin/cycles/show.statuses.html',
		controller: ['$scope', '$rootScope', '$state', '$stateParams', '$window', 'Status', function($scope, $rootScope, $state, $stateParams, $window, Status) {
			$scope.statuses = [];

			$scope.statusCreate = null;
			$scope.toggleCreate = function(status) {
				$scope.statusCreate = $scope.statusCreate ? null : new Status();
			};

			$scope.backup = {};
			$scope.toggleEdit = function(status) {
				if(!$scope.backup[status.id])
					return $scope.backup[status.id] = angular.copy(status);

				// revert to backup
				angular.extend(status, $scope.backup[status.id]);
				delete $scope.backup[status.id];
			};

			function getStatuses(cycle){
				cycle = cycle || $scope.cycle; if(!cycle) return;
				$scope.statuses = Status.query({cycle: cycle.id})
				$scope.backup = {};
			}

			$scope.$on('cycles', function(){ getStatuses(); });
			$scope.$watch('cycle', getStatuses, true);


			$scope.save = function(status) {
				if(!status) return $window.alert('No status specified.');
				status.$save({cycle: $scope.cycle.id, id: status.id}).then(function(status){

					// broadcast update event
					$rootScope.$broadcast('cycles', $scope.cycle.id);

				}, function(err){
					if(err.data && err.data.message)
						$window.alert(err.data.message);
					else
						$window.alert('There was a problem saving your changes.');
				});
			};

			$scope.update = function(status) {
				if(!status) return $window.alert('No status specified.');
				status.$update({cycle: $scope.cycle.id, id: status.id}).then(function(status){

					// broadcast update event
					$rootScope.$broadcast('cycles', $scope.cycle.id);
					
				}, function(err){
					if(err.data && err.data.message)
						$window.alert(err.data.message);
					else
						$window.alert('There was a problem saving your changes.');
				});
			};

			$scope.delete = function(status) {
				if(!status) return $window.alert('No status specified.');
				if(!$window.confirm('Are you sure you want to delete this status?')) return;
				status.$delete({cycle: $scope.cycle.id, id: status.id}).then(function(status){

					// broadcast update event
					$rootScope.$broadcast('cycles', $scope.cycle.id);
					
				}, function(err){
					if(err.data && err.data.message)
						$window.alert(err.data.message);
					else
						$window.alert('There was a problem saving your changes.');
				});
			};

			$scope.create = function() {
				if(!$scope.statusCreate.id || !$scope.statusCreate.id.length)
					return $window.alert('An ID must be set.');

				$scope.statusCreate.$save({cycle: $scope.cycle.id, id: $scope.statusCreate.id}).then(function(status){

					// clear the form
					$scope.statusCreate = null;

					// broadcast update event
					$rootScope.$broadcast('cycles', $scope.cycle.id);

				}, function(err){
					if(err.data && err.data.message)
						$window.alert(err.data.message);
					else
						$window.alert('There was a problem saving your changes.');
				});
			};
		}]
	})

	.state('portal.admin.cycles.show.stages', {
		url: '/stages',
		templateUrl: 'portal/admin/cycles/show.stages.html',
		controller: ['$scope', '$rootScope', '$state', '$stateParams', '$window', 'Stage', function($scope, $rootScope, $state, $stateParams, $window, Stage) {
			$scope.stages = [];

			$scope.stageCreate = null;
			$scope.toggleCreate = function(stage) {
				$scope.stageCreate = $scope.stageCreate ? null : new Stage();
			};

			$scope.backup = {};
			$scope.toggleEdit = function(stage) {
				if(!$scope.backup[stage.id])
					return $scope.backup[stage.id] = angular.copy(stage);

				// revert to backup
				angular.extend(stage, $scope.backup[stage.id]);
				delete $scope.backup[stage.id];
			};

			function getStages(cycle){
				cycle = cycle || $scope.cycle; if(!cycle) return;
				$scope.stages = Stage.query({cycle: cycle.id})
				$scope.backup = {};
			}

			$scope.$on('cycles', function(){ getStages(); });
			$scope.$watch('cycle', getStages, true);


			$scope.save = function(stage) {
				if(!stage) return $window.alert('No stage specified.');
				stage.$save({cycle: $scope.cycle.id, id: stage.id}).then(function(stage){

					// broadcast update event
					$rootScope.$broadcast('cycles', $scope.cycle.id);

				}, function(err){
					if(err.data && err.data.message)
						$window.alert(err.data.message);
					else
						$window.alert('There was a problem saving your changes.');
				});
			};

			$scope.update = function(stage) {
				if(!stage) return $window.alert('No stage specified.');
				stage.$update({cycle: $scope.cycle.id, id: stage.id}).then(function(stage){

					// broadcast update event
					$rootScope.$broadcast('cycles', $scope.cycle.id);
					
				}, function(err){
					if(err.data && err.data.message)
						$window.alert(err.data.message);
					else
						$window.alert('There was a problem saving your changes.');
				});
			};

			$scope.delete = function(stage) {
				if(!stage) return $window.alert('No stage specified.');
				if(!$window.confirm('Are you sure you want to delete this stage?')) return;
				stage.$delete({cycle: $scope.cycle.id, id: stage.id}).then(function(stage){

					// broadcast update event
					$rootScope.$broadcast('cycles', $scope.cycle.id);
					
				}, function(err){
					if(err.data && err.data.message)
						$window.alert(err.data.message);
					else
						$window.alert('There was a problem saving your changes.');
				});
			};

			$scope.create = function() {
				if(!$scope.stageCreate.id || !$scope.stageCreate.id.length)
					return $window.alert('An ID must be set.');

				$scope.stageCreate.$save({cycle: $scope.cycle.id, id: $scope.stageCreate.id}).then(function(stage){

					// clear the form
					$scope.stageCreate = null;

					// broadcast update event
					$rootScope.$broadcast('cycles', $scope.cycle.id);

				}, function(err){
					if(err.data && err.data.message)
						$window.alert(err.data.message);
					else
						$window.alert('There was a problem saving your changes.');
				});
			};
		}]
	})

	.state('portal.admin.cycles.show.stages.stage', {
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
