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

			$scope.$on('Cycle', function(){ getList(); });
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
		controller: ['$scope', '$state', '$stateParams', '$rootScope', 'Cycle', function($scope, $state, $stateParams, $rootScope, Cycle){
			$scope.refresh = function(){
				$rootScope.$broadcast('cycles');
			};

			// the model to edit
			$scope.cycleCreate = new Cycle();

			// save
			$scope.create = function() {
				$scope.cycleCreate.$create().then(function(cycle) {

					// redirect
					$state.go('portal.admin.cycles.show', {
						cycle: cycle.id
					});

				});
			};

		}]
	})

	.state('portal.admin.cycles.show', {
		url: '/show/:cycle',
		templateUrl: 'portal/admin/cycles/show.html',
		controller: ['$scope', '$state', '$stateParams', '$window', 'Cycle', 'Role', 'Status', function($scope, $state, $stateParams, $window, Cycle, Role, Status){

			$scope.edit = false;
			$scope.toggleEdit = function(){
				$scope.edit = !$scope.edit;
			};

			$scope.source = false;
			$scope.toggleSource = function(){
				$scope.source = !$scope.source;
			};

			// Get Resources
			// -------------

			function getCycle(){
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
				});

				// get cycle statuses
				Status.query({cycle: $stateParams.cycle}).$promise.then(function(statuses){
					$scope.statuses = statuses;
					$scope.statusesById = _.indexBy(statuses, 'id');
				});

				// TODO: get cycle stages
			}

			getCycle();
			$scope.$on('Cycle', getCycle);



			// Actions
			// -------

			$scope.update = function(){
				$scope.cycleEdit.$update({id: $scope.cycle.id, foo: 'bar'}).then(function(){
					// redirect
					$scope.edit = false;
				});
			};

			$scope.destroy = function(){
				if(!$window.confirm('Are you sure you want to delete this cycle?'))
					return;

				$scope.cycle.$delete({id: $scope.cycle.id}).then(function(){
					// redirect
					$state.go('portal.admin.cycles.list');
				});
			};
		}]
	})

	.state('portal.admin.cycles.show.roles', {
		url: '/roles',
		templateUrl: 'portal/admin/cycles/show.roles.html',
		controller: ['$scope', '$state', '$stateParams', '$window', 'Role', function($scope, $state, $stateParams, $window, Role) {
			$scope.roles = [];
			
			$scope.roleCreate = null;
			$scope.toggleCreate = function() {
				$scope.roleCreate = $scope.roleCreate ? null : new Role();
			};

			$scope.backup = {};
			$scope.toggleEdit = function(role) {
				if(!$scope.backup[role.id])
					return ($scope.backup[role.id] = angular.copy(role));

				// revert to backup
				angular.extend(role, $scope.backup[role.id]);
				delete $scope.backup[role.id];
			};



			// Get Resources
			// -------------

			function getRoles(){
				$scope.roles = Role.query({cycle: $stateParams.cycle});
				$scope.backup = {};
			}

			getRoles();
			$scope.$on('Cycle', getRoles);



			// Actions
			// -------

			$scope.save = function(role) {
				if(!role) return $window.alert('No role specified.');
				role.$save({cycle: $scope.cycle.id, id: role.id});
			};

			$scope.update = function(role) {
				if(!role) return $window.alert('No role specified.');
				role.$update({cycle: $scope.cycle.id, id: role.id});
			};

			$scope.delete = function(role) {
				if(!role) return $window.alert('No role specified.');
				if(!$window.confirm('Are you sure you want to delete this role?')) return;
				role.$delete({cycle: $scope.cycle.id, id: role.id});
			};

			$scope.create = function() {
				if(!$scope.roleCreate.id || !$scope.roleCreate.id.length)
					return $window.alert('An ID must be set.');

				// Set empty assignable and visible
				$scope.roleCreate.assignable = {};
				$scope.roleCreate.visible = {};

				$scope.roleCreate.$save({cycle: $scope.cycle.id, id: $scope.roleCreate.id}).then(function(){
					// clear the form
					$scope.roleCreate = null;
				});
			};
		}]
	})

	.state('portal.admin.cycles.show.statuses', {
		url: '/statuses',
		templateUrl: 'portal/admin/cycles/show.statuses.html',
		controller: ['$scope', '$state', '$stateParams', '$window', 'Status', function($scope, $state, $stateParams, $window, Status) {
			$scope.statuses = [];

			$scope.statusCreate = null;
			$scope.toggleCreate = function() {
				$scope.statusCreate = $scope.statusCreate ? null : new Status();
			};

			$scope.backup = {};
			$scope.toggleEdit = function(status) {
				if(!$scope.backup[status.id])
					return ($scope.backup[status.id] = angular.copy(status));

				// revert to backup
				angular.extend(status, $scope.backup[status.id]);
				delete $scope.backup[status.id];
			};


			// Get Resources
			// -------------

			function getStatuses(){
				$scope.statuses = Status.query({cycle: $stateParams.cycle});
				$scope.backup = {};
			}

			getStatuses();
			$scope.$on('Cycle', getStatuses);


			// Actions
			// -------

			$scope.save = function(status) {
				if(!status) return $window.alert('No status specified.');
				status.$save({cycle: $scope.cycle.id, id: status.id});
			};

			$scope.update = function(status) {
				if(!status) return $window.alert('No status specified.');
				status.$update({cycle: $scope.cycle.id, id: status.id});
			};

			$scope.delete = function(status) {
				if(!status) return $window.alert('No status specified.');
				if(!$window.confirm('Are you sure you want to delete this status?')) return;
				status.$delete({cycle: $scope.cycle.id, id: status.id});
			};

			$scope.create = function() {
				if(!$scope.statusCreate.id || !$scope.statusCreate.id.length)
					return $window.alert('An ID must be set.');

				$scope.statusCreate.$save({cycle: $scope.cycle.id, id: $scope.statusCreate.id}).then(function(){
					// clear the form
					$scope.statusCreate = null;
				});
			};
		}]
	})

	.state('portal.admin.cycles.show.assignments', {
		url: '/assignments',
		templateUrl: 'portal/admin/cycles/show.assignments.html',
		controller: ['$scope', '$state', '$stateParams', '$window', 'Assignment', 'User', 'Role', function($scope, $state, $stateParams, $window, Assignment, User, Role) {
			$scope.assignments = [];

			$scope.assignmentCreate = null;
			$scope.toggleCreate = function() {
				$scope.assignmentCreate = $scope.assignmentCreate ? null : new Assignment();
			};

			$scope.backup = {};
			$scope.toggleEdit = function(assignment) {
				if(!$scope.backup[assignment.id])
					return ($scope.backup[assignment.id] = angular.copy(assignment));

				// revert to backup
				angular.extend(assignment, $scope.backup[assignment.id]);
				delete $scope.backup[assignment.id];
			};

			// new user assignment
			$scope.userSelect = {
				data: [],
				// filter out users who are already part of the project
				filter: function(u){
					return Object.keys($scope.assignmentsById).indexOf(u.id) === -1;
				},
				// search for possible users
				search: function(search){
					User.query({search: search, sort: [{path: ['name']}], per_page: 20}).$promise.then(function(users){
						$scope.userSelect.data = users;
					});
				}
			}

			// Get Resources
			// -------------

			function getAssignments(){
				Assignment.query({cycle: $stateParams.cycle}).$promise.then(function(assignments){
					$scope.assignments = assignments;
					$scope.assignmentsById = _.indexBy(assignments, 'id');
					$scope.backup = {};
				});
			}
			getAssignments();
			$scope.$on('Cycle', getAssignments);


			function getRoles(){
				Role.query({cycle: $stateParams.cycle}).$promise.then(function(roles){
					$scope.roles = roles;
					$scope.rolesById = _.indexBy(roles, 'id');
				});
			}
			getRoles();
			$scope.$on('Cycle', getRoles);


			function getUsers(){
				// TODO: we need to re-implement /cycles/:cycle/users in the API!!!!
				User.query({cycle: $stateParams.cycle}).$promise.then(function(users){
					$scope.users = users;
					$scope.usersById = _.indexBy(users, 'id');
				});

			}
			getUsers();
			$scope.$on('User', getUsers);
			$scope.$on('Cycle', getUsers);



			// Actions
			// -------

			$scope.save = function(assignment) {
				if(!assignment) return $window.alert('No assignment specified.');
				assignment.$save({cycle: $scope.cycle.id, id: assignment.id});
			};

			$scope.update = function(assignment) {
				if(!assignment) return $window.alert('No assignment specified.');
				assignment.$update({cycle: $scope.cycle.id, id: assignment.id});
			};

			$scope.delete = function(assignment) {
				if(!assignment) return $window.alert('No assignment specified.');
				if(!$window.confirm('Are you sure you want to delete this assignment?')) return;
				assignment.$delete({cycle: $scope.cycle.id, id: assignment.id});
			};

			$scope.create = function() {
				if(!$scope.assignmentCreate.id || !$scope.assignmentCreate.id.length)
					return $window.alert('An ID must be set.');

				$scope.assignmentCreate.$save({cycle: $scope.cycle.id, id: $scope.assignmentCreate.id}).then(function(assignment){

					// clear the form
					$scope.assignmentCreate = null;

				});
			};
		}]
	})

	.state('portal.admin.cycles.show.stages', {
		url: '/stages',
		templateUrl: 'portal/admin/cycles/show.stages.html',
		controller: ['$scope', '$state', '$stateParams', '$window', 'GandhiComponent', 'Stage', function($scope, $state, $stateParams, $window, GandhiComponent, Stage) {
			$scope.stages = [];

			$scope.stageCreate = null;
			$scope.toggleCreate = function(stage) {
				$scope.stageCreate = $scope.stageCreate ? null : new Stage();
			};

			$scope.backup = {};
			$scope.toggleEdit = function(stage) {
				if(!$scope.backup[stage.id])
					return ($scope.backup[stage.id] = angular.copy(stage));

				// revert to backup
				angular.extend(stage, $scope.backup[stage.id]);
				delete $scope.backup[stage.id];
			};

			function getStages(){
				$scope.stages = Stage.query({cycle: $stateParams.cycle});
				$scope.backup = {};
			}

			$scope.$on('Cycle', getStages);
			$scope.$watch('cycle', getStages, true);


			$scope.save = function(stage) {
				if(!stage) return $window.alert('No stage specified.');
				stage.$save({cycle: $scope.cycle.id, id: stage.id});
			};

			$scope.update = function(stage) {
				if(!stage) return $window.alert('No stage specified.');
				stage.$update({cycle: $scope.cycle.id, id: stage.id});
			};

			$scope.delete = function(stage) {
				if(!stage) return $window.alert('No stage specified.');
				if(!$window.confirm('Are you sure you want to delete this stage?')) return;
				stage.$delete({cycle: $scope.cycle.id, id: stage.id});
			};

			$scope.create = function() {
				if(!$scope.stageCreate.id || !$scope.stageCreate.id.length)
					return $window.alert('An ID must be set.');

				$scope.stageCreate.$save({cycle: $scope.cycle.id, id: $scope.stageCreate.id}).then(function(stage){
					// clear the form
					$scope.stageCreate = null;
				});
			};


			$scope.components = GandhiComponent;

			$scope.sortableOptions = {
				handle: '> td.handle',
				stop: function() {
					// Update each stage that changed
					$scope.stages.forEach(function(stage, i){
						if(stage.order != i) new Stage({order: i}).$update({cycle: $scope.cycle.id, id: stage.id});
					});
				}
			};
		}]
	})

	.state('portal.admin.cycles.show.stages.stage', {
		url: '/:stage',
		template: '<div gandhi-component="{cycle: cycle, project: project, stage: stage, role: role, mode: \'admin\'}"></div>',
		controller: ['$scope', '$state', '$stateParams', 'Stage', function($scope, $state, $stateParams, Stage) {
			$scope.stage = null;

			$scope.backup = null;
			$scope.toggleEdit = function() {
				if(!$scope.backup)
					return ($scope.backup = angular.copy($scope.stage));

				// revert to backup
				angular.extend($scope.stage, $scope.backup);
				$scope.backup = null;
			};

			function getStage(){
				$scope.stages = Stage.get({cycle: $stateParams.cycle, id: $stateParams.stage});
				$scope.backup = null;
			}

			$scope.$on('Cycle', getStage);
			$scope.$watch('cycle', getStage, true);
		}]
	});

});
