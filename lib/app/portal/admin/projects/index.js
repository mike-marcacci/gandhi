angular.module('gandhi')

.config(function($stateProvider) {
	'use strict';

	$stateProvider

	.state('portal.admin.projects', {
		url: '/projects',
		abstract: true,
		template: '<div ui-view></div>',
		controller: ['$scope', 'Project', 'Cycle', 'User', 'Export', function($scope, Project, Cycle, User, Export){

			// the default columns
			var columns = $scope.columns = [
				{primary: true, active: true, title: 'Title', path: ['title']},
				{primary: true, active: true, title: 'Status', path: ['status','title']},
				{primary: false, active: true, title: 'Created', path: ['created'], template: '{{row.created * 1000 | date:"yyyy.MM.dd - hh:mm a"}}'},
				{primary: false, active: true, title: 'Updated', path: ['updated'], template: '{{row.updated * 1000 | date:"yyyy.MM.dd - hh:mm a"}}'}
			];

			$scope.table = {
				query: {
					sort: [{path: ['title'], direction: 'asc'}]
				},
				pages: {},
				columns: columns
			};

			// filter by cycle
			$scope.cycleSelect = {
				data: [],
				search: function(search){
					Cycle.query({search: search, sort: [{path: ['title']}], per_page: 20}).$promise.then(function(cycles){
						$scope.cycleSelect.data = cycles;
					});
				}
			};

			// filter by user
			$scope.userSelect = {
				data: [],
				search: function(search){
					User.query({search: search, sort: [{path: ['name']}], per_page: 20}).$promise.then(function(users){
						$scope.userSelect.data = users;
					});
				}
			};

			// apply custom columns
			$scope.$watch('table.query.cycle', function(cycle_id) {
				if(!cycle_id) return ($scope.exports = null);
				Export.query({cycle: cycle_id}).$promise.then(function(exports){
					$scope.columns = _.union(columns, exports);
				});
			});

			$scope.$watch('columns', function(c){
				if(c) $scope.table.columns = _.where(c, {active: true});
			}, true);


			function getProjects(query){
				Project.query(query || $scope.table.query, function(projects, h){
					$scope.projects = $scope.table.data = projects;
					$scope.table.pages = JSON.parse(h('pages'));
				});
			}
			$scope.$on('Project', getProjects);
			$scope.$watch('table.query', getProjects, true);
		}]
	})

	.state('portal.admin.projects.list', {
		url: '',
		templateUrl: 'portal/admin/projects/list.html'
	})

	.state('portal.admin.projects.create', {
		url: '/create',
		templateUrl: 'portal/admin/projects/create.html',
		controller: ['$scope', '$state', '$stateParams', '$rootScope', 'Project', 'Cycle', function($scope, $state, $stateParams, $rootScope, Project, Cycle){
			$scope.refresh = function(){
				$rootScope.$broadcast('Project');
			};

			// the model to edit
			$scope.projectCreate = new Project();

			// new cycle assignment
			$scope.cycleSelect = {
				data: [],
				// search for possible cycles
				search: function(search){
					Cycle.query({search: search, sort: [{path: ['title']}], per_page: 20}).$promise.then(function(cycles){
						$scope.cycleSelect.data = cycles;
					});
				}
			};

			// save
			$scope.create = function() {
				$scope.projectCreate.$create().then(function(project) {

					// redirect
					$state.go('portal.admin.projects.show', {
						project: project.id
					});

				});
			};

		}]
	})

	.state('portal.admin.projects.show', {
		url: '/show/:project',
		templateUrl: 'portal/admin/projects/show.html',
		controller: ['$scope', '$state', '$stateParams', '$window', 'Project', 'Cycle', 'Role', 'Status', 'Stage', function($scope, $state, $stateParams, $window, Project, Cycle, Role, Status, Stage){
			var projectBackup = null;

			$scope.projectEdit = null;
			$scope.toggleEdit = function(){
				$scope.projectEdit = $scope.projectEdit ? null : new Project($scope.project);
			};

			$scope.source = {project: null};
			$scope.toggleSource = function(){
				if($scope.source.project)
				return ($scope.source.project = null);

				$scope.source.project = angular.copy($scope.project);

				// remove calculated properties
				delete $scope.source.project.role;
				delete $scope.source.project.events;
				delete $scope.source.project.values;
			};

			// Get Resources
			// -------------

			function getProject(){
				if(!$stateParams.project)
					return;

				// get the project
				Project.get({id: $stateParams.project}).$promise.then(function(project){
					$scope.project = project;
					projectBackup = angular.copy(project);

					// get the cycle
					Cycle.get({id: project.cycle_id}).$promise.then(function(cycle){
						$scope.cycle = cycle;
					});

					// get cycle roles
					Role.query({cycle: project.cycle_id}).$promise.then(function(roles){
						$scope.roles = roles;
						$scope.rolesById = _.indexBy(roles, 'id');
					});

					// get cycle statuses
					Status.query({cycle: project.cycle_id}).$promise.then(function(statuses){
						$scope.statuses = statuses;
						$scope.statusesById = _.indexBy(statuses, 'id');
					});

					// get cycle stages
					Stage.query({cycle: project.cycle_id}).$promise.then(function(stages){
						$scope.stages = stages;
						$scope.stagesById = _.indexBy(stages, 'id');
					});
				});
			}
			getProject();
			$scope.$on('Project', getProject);



			// Actions
			// -------

			$scope.update = function(){
				$scope.projectEdit.$update({id: $scope.project.id}).then(function(){
					$scope.projectEdit = null;
				});
			};

			$scope.updatePermissions = function(){
				new Project({permissions: $scope.project.permissions}).$update({id: $scope.project.id}).then(function(){
					$scope.projectPermissionsEdit = false;
				});
			};

			$scope.updateSource = function(){
				new Project($scope.source.project).$update({id: $scope.project.id}).then(function(){
					$scope.source.project = null;
				});
			};

			$scope.destroy = function(){
				if(!$window.confirm('Are you sure you want to delete this project?'))
					return;

				$scope.project.$delete({id: $scope.project.id}).then(function(){
					// redirect
					$state.go('portal.admin.projects.list');
				});
			};
		}]
	})

	.state('portal.admin.projects.show.assignments', {
		url: '/assignments',
		templateUrl: 'portal/admin/projects/show.assignments.html',
		controller: ['$scope', '$state', '$stateParams', '$window', 'ProjectAssignment', 'User', 'Role', function($scope, $state, $stateParams, $window, ProjectAssignment, User, Role) {
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
					User.query({search: search, sort: [{path: ['name']}], per_page: 20}).$promise.then(function(users){
						$scope.userSelect.data = users;
					});
				}
			};

			// Get Resources
			// -------------

			function getProjectAssignments(){
				ProjectAssignment.query({project: $stateParams.project}).$promise.then(function(assignments){
					$scope.assignments = assignments;
					$scope.assignmentsById = _.indexBy(assignments, 'id');
					$scope.backup = {};
				});
			}
			getProjectAssignments();
			$scope.$on('Project', getProjectAssignments);


			function getUsers(){
				// TODO: we need to re-implement /projects/:project/users in the API!!!!
				User.query({project: $stateParams.project}).$promise.then(function(users){
					$scope.users = users;
					$scope.usersById = _.indexBy(users, 'id');
				});

			}
			getUsers();
			$scope.$on('User', getUsers);
			$scope.$on('Project', getUsers);


			function getRoles(project){
				if(!project) return;
				$scope.roles = Role.query({cycle: project.cycle_id});
			}
			$scope.$watch('project', getRoles);


			// Actions
			// -------

			$scope.save = function(assignment) {
				if(!assignment) return $window.alert('No assignment specified.');
				assignment.$save({project: $scope.project.id, id: assignment.id});
			};

			$scope.update = function(assignment) {
				if(!assignment) return $window.alert('No assignment specified.');
				assignment.$update({project: $scope.project.id, id: assignment.id});
			};

			$scope.delete = function(assignment) {
				if(!assignment) return $window.alert('No assignment specified.');
				if(!$window.confirm('Are you sure you want to delete this assignment?')) return;
				assignment.$delete({project: $scope.project.id, id: assignment.id});
			};

			$scope.create = function() {
				if(!$scope.assignmentCreate.id || !$scope.assignmentCreate.id.length)
					return $window.alert('An ID must be set.');

				$scope.assignmentCreate.$save({project: $scope.project.id, id: $scope.assignmentCreate.id}).then(function(){

					// clear the form
					$scope.assignmentCreate = null;

				});
			};
		}]
	})

	.state('portal.admin.projects.show.contents', {
		url: '/contents',
		templateUrl: 'portal/admin/projects/show.contents.html',
		controller: ['$scope', '$state', '$stateParams', '$window', 'GandhiComponent', 'Content',  function($scope, $state, $stateParams, $window, GandhiComponent, Content) {
			$scope.contents = [];

			// Get Resources
			// -------------

			function getContents(){
				$scope.contents = Content.query({project: $stateParams.project});
			}
			getContents();
			$scope.$on('Project', getContents);

			$scope.components = GandhiComponent;

		}]
	})

	.state('portal.admin.projects.show.contents.content', {
		url: '/:content',
		templateUrl: 'portal/admin/projects/show.contents.content.html',
		controller: ['$scope', '$state', '$stateParams', 'GandhiComponent', 'Content', 'Stage', function($scope, $state, $stateParams, GandhiComponent, Content, Stage) {
			$scope.content = null;
			$scope.component = null;
			var backup = null;

			$scope.editVisibility = false;
			$scope.toggleVisibility = function() {
				if(editVisibility) $scope.content.visible = angular.copy(backup.visible);
				$scope.editVisibility = !$scope.editVisibility;
			};

			$scope.editComponentPermissions = false;
			$scope.toggleComponentPermissions = function() {
				if(editComponentPermissions) $scope.content.component.permissions = angular.copy(backup.component.permissions);
				$scope.editComponentPermissions = !$scope.editComponentPermissions;
			};


			// Get Resources
			// -------------

			function getContent(){
				Content.get({project: $stateParams.project, id: $stateParams.content}).$promise.then(function(content){
					backup = angular.copy(content);
					$scope.content = content;
				});
			}
			getContent();
			$scope.$on('Project', getContent);

			function getStage(project){
				if(!project) return;
				Stage.get({cycle: project.cycle_id, id: $stateParams.content}).$promise.then(function(stage){
					$scope.stage = stage;
					$scope.component = GandhiComponent[stage.component.name];
				});
			}
			$scope.$watch('project', getStage);


			// Actions
			// -------

			$scope.updateVisibility = function() {
				new Content({visible: $scope.content.visible}).$update({id: $scope.content.id, project: $scope.project.id}).then(function(){
					$scope.editVisibility = false;
				})
			}

			$scope.updateComponentPermissions = function() {
				new Content({component: {permissions: $scope.content.component.permissions}}).$update({id: $scope.content.id, project: $scope.project.id}).then(function(){
					$scope.editComponentPermissions = false;
				})
			}
		}]
	});

});
