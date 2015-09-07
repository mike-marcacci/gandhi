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
					admin: true,
					sort: [{path: ['title'], direction: 'asc'}]
				},
				pages: {},
				columns: [
					{primary: true, sortable: true, title: 'Title', flex: 4, path: ['title']},
					{primary: true, sortable: true, title: 'Status', flex: 1, path: ['status_id'], template: '<span style="text-transform: capitalize;">{{value}}</span>'},
					{primary: false, sortable: true, title: 'Open', flex: 1, path: ['open'], template: '{{value ? \'Open\' : \'Closed\'}}'},
					{primary: false, sortable: true, title: 'Created', flex: 2, path: ['created'], template: '{{value * 1000 | date:"yyyy.MM.dd - hh:mm a"}}'},
					{primary: false, sortable: true, title: 'Updated', flex: 2, path: ['updated'], template: '{{value * 1000 | date:"yyyy.MM.dd - hh:mm a"}}'}
				]
			};

			function getCycles(query){
				Cycle.query(query || $scope.table.query, function(cycles, h){
					$scope.cycles = $scope.table.data = cycles;
					$scope.table.pages = JSON.parse(h('pages'));
				});
			}
			$scope.$on('Cycle', function(){ getCycles(); });
			$scope.$watch('table.query', getCycles, true);
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
				$rootScope.$broadcast('Cycle');
			};

			// the model to edit
			$scope.cycleCreate = new Cycle();

			// save
			$scope.create = function() {
				$scope.cycleCreate.$create({
					admin: true
				}).then(function(cycle) {

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
		controller: ['$scope', '$state', '$stateParams', '$window', 'Cycle', 'Role', 'Status', 'Trigger', function($scope, $state, $stateParams, $window, Cycle, Role, Status, Trigger){
			$scope.permissions = {
				'project:read': {
					id: 'project:read',
					title: 'Project: Read'
				},
				'project:create': {
					id: 'project:create',
					title: 'Project: Create'
				},
				'project:update': {
					id: 'project:update',
					title: 'Project: Update'
				},
				'project:delete': {
					id: 'project:delete',
					title: 'Project: Delete'
				},
				'project/assignments:read': {
					id: 'project/assignments:read',
					title: 'Assignments: Read'
				},
				'project/assignments:write': {
					id: 'project/assignments:write',
					title: 'Assignments: Write'
				},
				'project/contents:read': {
					id: 'project/contents:read',
					title: 'Contents: Read'
				},
				'project/contents:write': {
					id: 'project/contents:write',
					title: 'Contents: Write'
				}
			};



			var cycleBackup = null;

			$scope.cycleEdit = null;
			$scope.toggleEdit = function(){
				$scope.cycleEdit = $scope.cycleEdit ? null : new Cycle($scope.cycle);
			};

			$scope.cycleInstructionsEdit = false;
			$scope.toggleInstructionsEdit = function(){
				if($scope.cycleInstructionsEdit) $scope.cycle.instructions = angular.copy(cycleBackup.instructions);
				$scope.cycleInstructionsEdit = !$scope.cycleInstructionsEdit;
			};

			$scope.cyclePermissionsEdit = false;
			$scope.togglePermissionsEdit = function(){
				if($scope.cyclePermissionsEdit) $scope.cycle.permissions = angular.copy(cycleBackup.permissions);
				$scope.cyclePermissionsEdit = !$scope.cyclePermissionsEdit;
			};

			$scope.source = {cycle: null};
			$scope.toggleSource = function(){
				if($scope.source.cycle)
				return ($scope.source.cycle = null);

				$scope.source.cycle = angular.copy($scope.cycle);

				// remove calculated properties
				delete $scope.source.cycle.role;
				delete $scope.source.cycle.open;
			};

			// Get Resources
			// -------------

			function getCycle(){
				if(!$stateParams.cycle)
					return;

				// get the cycle
				Cycle.get({
					admin: true,
					id: $stateParams.cycle
				}).$promise.then(function(cycle){
					$scope.cycle = cycle;
					cycleBackup = angular.copy(cycle);
				});

				// get cycle roles
				Role.query({
					admin: true,
					cycle: $stateParams.cycle
				}).$promise.then(function(roles){
					$scope.roles = roles;
					$scope.rolesById = _.indexBy(roles, 'id');
				});

				// get cycle statuses
				Status.query({
					admin: true,
					cycle: $stateParams.cycle
				}).$promise.then(function(statuses){
					$scope.statuses = statuses;
					$scope.statusesById = _.indexBy(statuses, 'id');
				});

				// get cycle triggers
				Trigger.query({
					admin: true,
					cycle: $stateParams.cycle
				}).$promise.then(function(triggers){
					$scope.triggers = triggers;
					$scope.triggersById = _.indexBy(triggers, 'id');
				});

				// TODO: get cycle stages
			}
			getCycle();
			$scope.$on('Cycle', getCycle);



			// Actions
			// -------

			$scope.update = function(){
				$scope.cycleEdit.$update({
					admin: true,
					id: $scope.cycle.id
				}).then(function(){
					$scope.cycleEdit = null;
				});
			};

			$scope.updateInstructions = function(){
				new Cycle({instructions: $scope.cycle.instructions}).$update({
					admin: true,
					id: $scope.cycle.id
				}).then(function(){
					$scope.cycleInstructionsEdit = false;
				});
			};

			$scope.updatePermissions = function(){
				new Cycle({permissions: $scope.cycle.permissions}).$update({
					admin: true,
					id: $scope.cycle.id
				}).then(function(){
					$scope.cyclePermissionsEdit = false;
				});
			};

			$scope.updateSource = function(){
				new Cycle($scope.source.cycle).$update({
					admin: true,
					id: $scope.cycle.id
				}).then(function(){
					$scope.source.cycle = null;
				});
			};

			$scope.destroy = function(){
				if(!$window.confirm('Are you sure you want to delete this cycle?'))
					return;

				$scope.cycle.$delete({
					admin: true,
					id: $scope.cycle.id
				}).then(function(){
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
				$scope.roles = Role.query({
					admin: true,
					cycle: $stateParams.cycle
				});
				$scope.backup = {};
			}
			getRoles();
			$scope.$on('Cycle', getRoles);



			// Actions
			// -------

			$scope.save = function(role) {
				if(!role) return $window.alert('No role specified.');
				role.$save({
					admin: true,
					cycle: $scope.cycle.id,
					id: role.id
				});
			};

			$scope.update = function(role) {
				if(!role) return $window.alert('No role specified.');
				role.$update({
					admin: true,
					cycle: $scope.cycle.id,
					id: role.id
				});
			};

			$scope.delete = function(role) {
				if(!role) return $window.alert('No role specified.');
				if(!$window.confirm('Are you sure you want to delete this role?')) return;
				role.$delete({
					admin: true,
					cycle: $scope.cycle.id,
					id: role.id
				});
			};

			$scope.create = function() {

				// Set empty assignable and visible
				$scope.roleCreate.assignable = {};
				$scope.roleCreate.visible = {};

				$scope.roleCreate.$create({
					admin: true,
					cycle: $scope.cycle.id
				}).then(function(){
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
				$scope.statuses = Status.query({
					admin: true,
					cycle: $stateParams.cycle
				});
				$scope.backup = {};
			}
			getStatuses();
			$scope.$on('Cycle', getStatuses);


			// Actions
			// -------

			$scope.save = function(status) {
				if(!status) return $window.alert('No status specified.');
				status.$save({
					admin: true,
					cycle: $scope.cycle.id,
					id: status.id
				});
			};

			$scope.update = function(status) {
				if(!status) return $window.alert('No status specified.');
				status.$update({
					admin: true,
					cycle: $scope.cycle.id,
					id: status.id
				});
			};

			$scope.delete = function(status) {
				if(!status) return $window.alert('No status specified.');
				if(!$window.confirm('Are you sure you want to delete this status?')) return;
				status.$delete({
					admin: true,
					cycle: $scope.cycle.id,
					id: status.id
				});
			};

			$scope.create = function() {
				$scope.statusCreate.$create({
					admin: true,
					cycle: $scope.cycle.id
				}).then(function(){
					// clear the form
					$scope.statusCreate = null;
				});
			};
		}]
	})

	.state('portal.admin.cycles.show.triggers', {
		url: '/triggers',
		templateUrl: 'portal/admin/cycles/show.triggers.html',
		controller: ['$scope', '$state', '$stateParams', '$window', 'Trigger', 'Status', 'Stage', function($scope, $state, $stateParams, $window, Trigger, Status, Stage) {
			$scope.triggers = [];

			$scope.triggerCreate = null;
			$scope.toggleCreate = function() {
				$scope.triggerCreate = $scope.triggerCreate ? null : new Trigger();
			};

			$scope.backup = {};
			$scope.toggleEdit = function(trigger) {
				if(!$scope.backup[trigger.id])
					return ($scope.backup[trigger.id] = angular.copy(trigger));

				// revert to backup
				angular.extend(trigger, $scope.backup[trigger.id]);
				delete $scope.backup[trigger.id];
			};


			// Get Resources
			// -------------

			function getTriggers(){
				Trigger.query({
					admin: true,
					cycle: $stateParams.cycle
				}).$promise.then(function(triggers){
					$scope.triggers = triggers;
					$scope.triggersById = _.indexBy(triggers, 'id');
				});
				$scope.backup = {};
			}
			getTriggers();
			$scope.$on('Cycle', getTriggers);


			function getStatuses(){
				Status.query({
					admin: true,
					cycle: $stateParams.cycle
				}).$promise.then(function(statuses){
					$scope.statuses = statuses;
					$scope.statusesById = _.indexBy(statuses, 'id');
				});
			}
			getStatuses();
			$scope.$on('Cycle', getStatuses);


			// function getExports(){
			// 	Export.query({
			// 		admin: true,
			// 		cycle: $stateParams.cycle
			// 	}).$promise.then(function(exports){
			// 		$scope.exports = exports;
			// 		$scope.exportsById = _.indexBy(exports, 'id');
			// 	});
			// }
			// getExports();
			// $scope.$on('Cycle', getExports);


			function getStages(){
				Stage.query({
					admin: true,
					cycle: $stateParams.cycle
				}).$promise.then(function(stages){
					$scope.stages = stages;
					$scope.stagesById = _.indexBy(stages, 'id');
				});
			}
			getStages();
			$scope.$on('Cycle', getStages);


			// Actions
			// -------

			$scope.save = function(trigger) {
				if(!trigger) return $window.alert('No trigger specified.');
				trigger.$save({
					admin: true,
					cycle: $scope.cycle.id,
					id: trigger.id
				});
			};

			$scope.update = function(trigger) {
				if(!trigger) return $window.alert('No trigger specified.');
				trigger.$update({
					admin: true,
					cycle: $scope.cycle.id,
					id: trigger.id
				});
			};

			$scope.delete = function(trigger) {
				if(!trigger) return $window.alert('No trigger specified.');
				if(!$window.confirm('Are you sure you want to delete this trigger?')) return;
				trigger.$delete({
					admin: true,
					cycle: $scope.cycle.id,
					id: trigger.id
				});
			};

			$scope.create = function() {
				$scope.triggerCreate.$create({
					admin: true,
					cycle: $scope.cycle.id
				}).then(function(){
					// clear the form
					$scope.triggerCreate = null;
				});
			};

			$scope.removeIndex = function(collection, index) {
				collection.splice(index, 1);
			};

			$scope.addCondition = function(collection) {
				collection.push({name: 'status', invert: false, options: {}});
			};

			$scope.addGroup = function(collection) {
				collection.push([]);
				$scope.addCondition(collection[collection.length - 1]);
			};
		}]
	})

	.state('portal.admin.cycles.show.triggers.trigger', {
		url: '/:trigger',
		templateUrl: 'portal/admin/cycles/show.triggers.trigger.html',
		controller: ['$scope', '$state', '$stateParams', 'GandhiComponent', 'Trigger', 'Role', function($scope, $state, $stateParams, GandhiComponent, Trigger, Role) {
			$scope.trigger = null;
			$scope.component = null;
			var backup = null;

			$scope.editVisibility = false;
			$scope.toggleVisibility = function() {
				if($scope.editVisibility) $scope.trigger.visible = angular.copy(backup.visible);
				$scope.editVisibility = !$scope.editVisibility;
			};

			$scope.editComponentPermissions = false;
			$scope.toggleComponentPermissions = function() {
				if($scope.editComponentPermissions) $scope.trigger.component.permissions = angular.copy(backup.component.permissions);
				$scope.editComponentPermissions = !$scope.editComponentPermissions;
			};


			// Get Resources
			// -------------

			function getTrigger(){
				Trigger.get({
					admin: true,
					cycle: $stateParams.cycle,
					id: $stateParams.trigger
				}).$promise.then(function(trigger){
					backup = angular.copy(trigger);
					$scope.trigger = trigger;
				});
			}
			getTrigger();
			$scope.$on('Cycle', getTrigger);


			function getRoles(){
				Role.query({
					admin: true,
					cycle: $stateParams.cycle
				}).$promise.then(function(roles){
					$scope.roles = roles;
					$scope.rolesById = _.indexBy(roles, 'id');
				});
			}
			getRoles();
			$scope.$on('Cycle', getRoles);


			// Actions
			// -------

			$scope.updateVisibility = function() {
				new Trigger({visible: $scope.trigger.visible}).$update({
					admin: true,
					id: $scope.trigger.id,
					cycle: $scope.cycle.id
				}).then(function(){
					$scope.editVisibility = false;
				});
			};

			$scope.updateComponentPermissions = function() {
				new Trigger({component: {permissions: $scope.trigger.component.permissions}}).$update({
					admin: true,
					id: $scope.trigger.id,
					cycle: $scope.cycle.id
				}).then(function(){
					$scope.editComponentPermissions = false;
				});
			};
		}]
	})

	.state('portal.admin.cycles.show.assignments', {
		url: '/assignments',
		templateUrl: 'portal/admin/cycles/show.assignments.html',
		controller: ['$scope', '$state', '$stateParams', '$window', 'CycleAssignment', 'User', 'Role', function($scope, $state, $stateParams, $window, CycleAssignment, User, Role) {
			$scope.assignments = [];

			$scope.assignmentCreate = null;
			$scope.toggleCreate = function() {
				$scope.assignmentCreate = $scope.assignmentCreate ? null : new CycleAssignment();
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
					User.query({
						admin: true,
						search: search,
						sort: [{path: ['name']}],
						per_page: 20
					}).$promise.then(function(users){
						$scope.userSelect.data = users;
					});
				}
			};

			// Get Resources
			// -------------

			function getCycleAssignments(){
				CycleAssignment.query({
					admin: true,
					cycle: $stateParams.cycle
				}).$promise.then(function(assignments){
					$scope.assignments = assignments;
					$scope.assignmentsById = _.indexBy(assignments, 'id');
					$scope.backup = {};
				});
			}
			getCycleAssignments();
			$scope.$on('Cycle', getCycleAssignments);


			function getRoles(){
				Role.query({
					admin: true,
					cycle: $stateParams.cycle
				}).$promise.then(function(roles){
					$scope.roles = roles;
					$scope.rolesById = _.indexBy(roles, 'id');
				});
			}
			getRoles();
			$scope.$on('Cycle', getRoles);


			function getUsers(){
				User.query({
					admin: true,
					cycle: $stateParams.cycle,
					per_page: 0
				}).$promise.then(function(users){
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
				assignment.$save({
					admin: true,
					cycle: $scope.cycle.id,
					id: assignment.id
				});
			};

			$scope.update = function(assignment) {
				if(!assignment) return $window.alert('No assignment specified.');
				assignment.$update({
					admin: true,
					cycle: $scope.cycle.id,
					id: assignment.id
				});
			};

			$scope.delete = function(assignment) {
				if(!assignment) return $window.alert('No assignment specified.');
				if(!$window.confirm('Are you sure you want to delete this assignment?')) return;
				assignment.$delete({
					admin: true,
					cycle: $scope.cycle.id,
					id: assignment.id
				});
			};

			$scope.create = function() {
				if(!$scope.assignmentCreate.id || !$scope.assignmentCreate.id.length)
					return $window.alert('An ID must be set.');

				$scope.assignmentCreate.$save({
					admin: true,
					cycle: $scope.cycle.id,
					id: $scope.assignmentCreate.id
				}).then(function(){

					// clear the form
					$scope.assignmentCreate = null;

				});
			};
		}]
	})

	.state('portal.admin.cycles.show.invitations', {
		url: '/invitations',
		templateUrl: 'portal/admin/cycles/show.invitations.html',
		controller: ['$scope', '$state', '$stateParams', '$window', 'CycleInvitation', 'User', 'Role', function($scope, $state, $stateParams, $window, CycleInvitation, User, Role) {
			$scope.invitations = [];

			$scope.invitationCreate = null;
			$scope.toggleCreate = function() {
				$scope.invitationCreate = $scope.invitationCreate ? null : new CycleInvitation();
			};

			$scope.backup = {};
			$scope.toggleEdit = function(invitation) {
				if(!$scope.backup[invitation.id])
					return ($scope.backup[invitation.id] = angular.copy(invitation));

				// revert to backup
				angular.extend(invitation, $scope.backup[invitation.id]);
				delete $scope.backup[invitation.id];
			};

			// Get Resources
			// -------------

			function getCycleInvitations(){
				CycleInvitation.query({
					admin: true,
					cycle: $stateParams.cycle
				}).$promise.then(function(invitations){
					$scope.invitations = invitations;
					$scope.invitationsById = _.indexBy(invitations, 'id');
					$scope.backup = {};
				});
			}
			getCycleInvitations();
			$scope.$on('Cycle', getCycleInvitations);


			function getRoles(){
				Role.query({
					admin: true,
					cycle: $stateParams.cycle
				}).$promise.then(function(roles){
					$scope.roles = roles;
					$scope.rolesById = _.indexBy(roles, 'id');
				});
			}
			getRoles();
			$scope.$on('Cycle', getRoles);



			// Actions
			// -------

			$scope.copyToClipboard = function(id) {
				var el = document.getElementById(id);
				el.select();
				document.execCommand('copy');
			}

			$scope.save = function(invitation) {
				if(!invitation) return $window.alert('No invitation specified.');
				invitation.$save({
					admin: true,
					cycle: $scope.cycle.id,
					id: invitation.id
				});
			};

			$scope.update = function(invitation) {
				if(!invitation) return $window.alert('No invitation specified.');
				invitation.$update({
					admin: true,
					cycle: $scope.cycle.id,
					id: invitation.id
				});
			};

			$scope.delete = function(invitation) {
				if(!invitation) return $window.alert('No invitation specified.');
				if(!$window.confirm('Are you sure you want to delete this invitation?')) return;
				invitation.$delete({
					admin: true,
					cycle: $scope.cycle.id,
					id: invitation.id
				});
			};

			$scope.create = function() {
				$scope.invitationCreate.$create({
					admin: true,
					cycle: $scope.cycle.id
				}).then(function(){

					// clear the form
					$scope.invitationCreate = null;

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

			// Get Resources
			// -------------

			function getStages(){
				Stage.query({
					admin: true,
					cycle: $stateParams.cycle
				}).$promise.then(function(stages){
					$scope.stages = stages;
				});
				$scope.backup = {};
			}
			getStages();
			$scope.$on('Cycle', getStages);


			// Actions
			// -------

			$scope.save = function(stage) {
				if(!stage) return $window.alert('No stage specified.');
				stage.$save({
					admin: true,
					cycle: $scope.cycle.id,
					id: stage.id
				});
			};

			$scope.update = function(stage) {
				if(!stage) return $window.alert('No stage specified.');
				stage.$update({
					admin: true,
					cycle: $scope.cycle.id,
					id: stage.id
				});
			};

			$scope.delete = function(stage) {
				if(!stage) return $window.alert('No stage specified.');
				if(!$window.confirm('Are you sure you want to delete this stage?')) return;
				stage.$delete({
					admin: true,
					cycle: $scope.cycle.id,
					id: stage.id
				});
			};

			$scope.create = function() {
				$scope.stageCreate.$create({
					admin: true,
					cycle: $scope.cycle.id
				}).then(function(stage){
					// clear the form
					$scope.stageCreate = null;
				});
			};


			$scope.components = GandhiComponent;

			$scope.sortableOptions = {
				handle: '> td.handle',
				stop: function(e, ui) {
					// only update the dragged stage, as the server will
					// handle normalizing order
					return new Stage({ order: $scope.stages.indexOf(ui.item.sortable.model) }).$update({
						admin: true,
						cycle: $scope.cycle.id,
						id: ui.item.sortable.model.id
					});
				}
			};
		}]
	})

	.state('portal.admin.cycles.show.stages.stage', {
		url: '/:stage',
		templateUrl: 'portal/admin/cycles/show.stages.stage.html',
		controller: ['$scope', '$state', '$stateParams', 'GandhiComponent', 'Stage', 'Role', function($scope, $state, $stateParams, GandhiComponent, Stage, Role) {
			$scope.stage = null;
			$scope.component = null;
			var backup = null;

			$scope.editVisibility = false;
			$scope.toggleVisibility = function() {
				if($scope.editVisibility) $scope.stage.visible = angular.copy(backup.visible);
				$scope.editVisibility = !$scope.editVisibility;
			};

			$scope.editComponentPermissions = false;
			$scope.toggleComponentPermissions = function() {
				if($scope.editComponentPermissions) $scope.stage.component.permissions = angular.copy(backup.component.permissions);
				$scope.editComponentPermissions = !$scope.editComponentPermissions;
			};


			// Get Resources
			// -------------

			function getStage(){
				Stage.get({
					admin: true,
					cycle: $stateParams.cycle,
					id: $stateParams.stage
				}).$promise.then(function(stage){
					backup = angular.copy(stage);
					$scope.stage = stage;
					$scope.component = GandhiComponent[stage.component.name];
				});
			}
			getStage();
			$scope.$on('Cycle', getStage);


			function getRoles(){
				Role.query({
					admin: true,
					cycle: $stateParams.cycle
				}).$promise.then(function(roles){
					$scope.roles = roles;
					$scope.rolesById = _.indexBy(roles, 'id');
				});
			}
			getRoles();
			$scope.$on('Cycle', getRoles);


			// Actions
			// -------

			$scope.updateVisibility = function() {
				new Stage({visible: $scope.stage.visible}).$update({
					admin: true,
					id: $scope.stage.id,
					cycle: $scope.cycle.id
				}).then(function(){
					$scope.editVisibility = false;
				});
			};

			$scope.updateComponentPermissions = function() {
				new Stage({component: {permissions: $scope.stage.component.permissions}}).$update({
					admin: true,
					id: $scope.stage.id,
					cycle: $scope.cycle.id
				}).then(function(){
					$scope.editComponentPermissions = false;
				});
			};
		}]
	});

});
