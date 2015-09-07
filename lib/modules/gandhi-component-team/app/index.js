'use strict';

angular.module('gandhi-component-team', ['gandhi-component', 'schemaForm'])

.config(function(GandhiComponentProvider) {
	GandhiComponentProvider.register({
		id: 'team',
		title: 'Team',
		permissions: {
			read: {
				id: 'read',
				title: 'Read'
			},
			write: {
				id: 'write',
				title: 'Write'
			}
		},
		directives: {
			default: 'gandhi-component-team',
			contentAdmin: 'gandhi-component-team',
			stageAdmin: 'gandhi-component-team-stage-admin'
		}
	});
})

.directive('gandhiComponentTeam', function() {
	return {
		scope: false,
		templateUrl: 'assets/bower/gandhi-component-team/app/default.html',
		controller: ['$scope', '$element', '$attrs', '$q', '$window', '$stateParams', 'User', 'Project', 'Content', 'Role', 'ProjectAssignment', 'ProjectInvitation',
		function($scope, $element, $attrs, $q, $window, $stateParams, User, Project, Content, Role, ProjectAssignment, ProjectInvitation) {
			$scope.$watch('context', function(context) {





				function getRoles(project){
					if(!project) return;
					$scope.project = project;
					Role.query({
						admin: false,
						cycle: project.cycle_id
					}).$promise.then(function(roles){
						$scope.roles = roles;
						$scope.visibleRoles = _(roles).filter(function(r) {
							return !!r.visible[project.role.id];
						}).indexBy('id').value()
						$scope.assignableRoles = _(roles).filter(function(r) {
							return !!r.assignable[project.role.id];
						}).indexBy('id').value()
						$scope.rolesById = _.indexBy(roles,'id');
					})
				}
				$scope.$watch('context.project', getRoles);








				// Assignments
				// ===========


				$scope.assignments = [];

				$scope.assignmentCreate = null;
				$scope.toggleCreate = function() {
					$scope.assignmentCreate = $scope.assignmentCreate ? null : new ProjectAssignment();
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
							admin: false,
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

				function getProjectAssignments(){
					ProjectAssignment.query({
						admin: false,
						project: $stateParams.project
					}).$promise.then(function(assignments){
						$scope.assignments = assignments;
						$scope.assignmentsById = _.indexBy(assignments, 'id');
						$scope.backup = {};
					});
				}
				getProjectAssignments();
				$scope.$on('Project', getProjectAssignments);


				function getUsers(){
					User.query({
						admin: false,
						project: $stateParams.project,
						per_page: 0
					}).$promise.then(function(users){
						$scope.users = users;
						$scope.usersById = _.indexBy(users, 'id');
					});
				}
				getUsers();
				$scope.$on('User', getUsers);
				$scope.$on('Project', getUsers);


				// Actions
				// -------

				$scope.save = function(assignment) {
					if(!assignment) return $window.alert('No assignment specified.');
					assignment.$save({
						admin: false,
						project: $scope.project.id,
						id: assignment.id
					});
				};

				$scope.update = function(assignment) {
					if(!assignment) return $window.alert('No assignment specified.');
					assignment.$update({
						admin: false,
						project: $scope.project.id,
						id: assignment.id
					});
				};

				$scope.delete = function(assignment) {
					if(!assignment) return $window.alert('No assignment specified.');
					if(!$window.confirm('Are you sure you want to delete this assignment?')) return;
					assignment.$delete({
						admin: false,
						project: $scope.project.id,
						id: assignment.id
					});
				};

				$scope.create = function() {
					if(!$scope.assignmentCreate.id || !$scope.assignmentCreate.id.length)
						return $window.alert('An ID must be set.');

					$scope.assignmentCreate.$save({
						admin: false,
						project: $scope.project.id,
						id: $scope.assignmentCreate.id
					}).then(function(){

						// clear the form
						$scope.assignmentCreate = null;

					});
				};













				// Invitations
				// ===========


				$scope.invitations = [];

				$scope.invitationCreate = null;
				$scope.toggleCreate = function() {
					$scope.invitationCreate = $scope.invitationCreate ? null : new ProjectInvitation();
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

				function getProjectInvitations(){
					ProjectInvitation.query({
						admin: false,
						project: $stateParams.project
					}).$promise.then(function(invitations){
						$scope.invitations = invitations;
						$scope.invitationsById = _.indexBy(invitations, 'id');
						$scope.backup = {};
					});
				}
				getProjectInvitations();
				$scope.$on('Project', getProjectInvitations);


				// Actions
				// -------

				$scope.copyToClipboard = function(id) {
					var el = document.getElementById(id);
					el.select();
					document.execCommand('copy');
				};

				$scope.save = function(invitation) {
					if(!invitation) return $window.alert('No invitation specified.');
					invitation.$save({
						admin: false,
						project: $scope.project.id,
						id: invitation.id
					});
				};

				$scope.update = function(invitation) {
					if(!invitation) return $window.alert('No invitation specified.');
					invitation.$update({
						admin: false,
						project: $scope.project.id,
						id: invitation.id
					});
				};

				$scope.delete = function(invitation) {
					if(!invitation) return $window.alert('No invitation specified.');
					if(!$window.confirm('Are you sure you want to delete this invitation?')) return;
					invitation.$delete({
						admin: false,
						project: $scope.project.id,
						id: invitation.id
					});
				};

				$scope.create = function() {
					$scope.invitationCreate.$create({
						admin: false,
						project: $scope.project.id
					}).then(function(){

						// clear the form
						$scope.invitationCreate = null;

					});
				};












			});
		}]
	};
})

.directive('gandhiComponentTeamStageAdmin', function() {
	return {
		scope: false,
		templateUrl: 'assets/bower/gandhi-component-team/app/stageAdmin.html',
		controller: ['$scope', '$element', '$attrs', 'Stage', function($scope, $element, $attrs, Stage) {
			$scope.$watch('context', function(context) {

				// give the view access to the context
				angular.extend($scope, context);

			});
		}]
	};
});
