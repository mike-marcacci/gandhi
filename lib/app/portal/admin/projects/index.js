angular.module('gandhi')

.config(function($stateProvider) {
	'use strict';

	$stateProvider

	.state('portal.admin.projects', {
		url: '/projects',
		abstract: true,
		template: '<div ui-view></div>',
		controller: ['$scope', 'Project', 'Cycle', 'User', 'Export', 'Stage', function($scope, Project, Cycle, User, Export, Stage){

			// the default columns
			var columns = $scope.columns = [
				{sortable: true, active: true, primary: true, group: 'Default', title: 'Title', flex: 4, path: ['title']},
				{sortable: false, active: true, primary: false, group: 'Default', title: 'Cycle', flex: 3, path: ['cycle_id'], template: '<a ui-sref="portal.admin.cycles.show({cycle: value})" ng-click="$event.stopPropagation()">{{scope.cyclesById[value].title}}</a>'},
				{sortable: false, active: false, primary: false, group: 'Default', title: 'Assignments', flex: 2, path: ['assignments'], template: '<div ng-repeat="a in value"><a title="{{scope.cyclesById[row.cycle_id].roles[a.role_id].title}}" ui-sref="portal.admin.users.show({user: a.id})" ng-click="$event.stopPropagation()">{{scope.usersById[a.id].name}}</a></div>', include: 'assignments'},
				{sortable: true, active: true, primary: true, group: 'Default', title: 'Status', flex: 1, path: ['status','title']},
				{sortable: true, active: true, primary: false, group: 'Default', title: 'Created', flex: 2, path: ['created'], template: '{{row.created * 1000 | date:"yyyy.MM.dd - hh:mm a"}}'},
				{sortable: true, active: true, primary: false, group: 'Default', title: 'Updated', flex: 2, path: ['updated'], template: '{{row.updated * 1000 | date:"yyyy.MM.dd - hh:mm a"}}'}
			];

			// scope for custom table templates
			$scope.listScope = {};

			// table configs
			$scope.table = {
				query: {
					admin: true,
					sort: [{path: ['title'], direction: 'asc'}]
				},
				pages: {},
				columns: columns
			};

			// filter by cycle
			$scope.cycleSelect = {
				data: [],
				search: function(search){
					Cycle.query({
						admin: true,
						search: search,
						sort: [{path: ['title']}],
						per_page: 20
					}).$promise.then(function(cycles){
						$scope.cycleSelect.data = cycles;
					});
				}
			};

			// filter by user
			$scope.userSelect = {
				data: [],
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

			// apply cycle-specific columns
			$scope.$watch('table.query.cycle', function(cycle_id) {
				$scope.columns = columns;
				if(!cycle_id) return;

				// get exports/values
				Export.query({
					admin: true,
					cycle: cycle_id
				}).$promise.then(function(exports){
					$scope.columns = _.union($scope.columns, exports.map(function(e){
						return {
							title: e.title,
							group: 'Exports',
							path: ['values', e.id],
							template: e.template,
							sortable: true
						};
					}));
				});

				// get stages/contents
				Stage.query({
					admin: true,
					cycle: cycle_id
				}).$promise.then(function(stages){
					$scope.columns = _.union($scope.columns, stages.map(function(s){
						return {
							title: s.title,
							group: 'Stages',
							path: ['contents', s.id, 'status_id'],
							sortable: false,
							include: 'contents',
							template: '{{value | title}}'
						};
					}));
				});
			});

			// group available columns
			$scope.$watchCollection('columns', function(columns){
				if(columns) $scope.columnsByGroup = _.groupBy(columns, 'group');
			});

			// toggle column activity
			$scope.toggleColumn = function(column) {
				column.active = !column.active;
				if(column.include) {
					var includes = _.unique($scope.columns.filter(function(c){
						return c.active && c.include;
					}).map(function(c){
						return c.include;
					}));

					// don't trigger another request if it's the same
					if(!_.isEqual($scope.table.query.includes, includes))
						$scope.table.query.includes = includes;
				}
			}

			// update the table to only show active columns
			$scope.$watch('columns', function(c){
				if(c) $scope.table.columns = _.where(c, {active: true});
			}, true);

			// perform secondary requests
			$scope.cycleIds = [];
			$scope.assignedUserIds = [];
			$scope.$watch('projects', function(projects){
				if(!projects || !projects.length) return;

				// get cycles
				var cycleIds = _.unique(_.pluck(projects,'cycle_id'));
				if(!_.isEqual(cycleIds, $scope.cycleIds))
					$scope.cycleIds = cycleIds;

				// get users & roles
				var assignedUserIds = _(projects).map(function(p){
					return p.assignments ? Object.keys(p.assignments) : null;
				}).flatten().unique().value();
				if(!_.isEqual(assignedUserIds, $scope.assignedUserIds))
					$scope.assignedUserIds = assignedUserIds;
			});

			// get all shown cycles
			$scope.$watch('cycleIds', function(cycleIds){
				if(!cycleIds || !cycleIds.length) return;

				Cycle.query({
					admin: true,
					filter: [{op: 'in', path: '/id', value: cycleIds}],
					includes: ['roles']
				}).$promise.then(function(cycles){
					$scope.listScope.cycles = cycles;
					$scope.listScope.cyclesById = _.indexBy(cycles, 'id');
				});
			})

			// get all shown, assigned users
			$scope.$watch('assignedUserIds', function(assignedUserIds){
				if(!assignedUserIds || !assignedUserIds.length) return;
				
				if(!$scope.table.query.includes || $scope.table.query.includes.indexOf('assignments') === -1) return;
				User.query({filter: [{op: 'in', path: '/id', value: assignedUserIds}]}).$promise.then(function(users){
					$scope.listScope.users = users;
					$scope.listScope.usersById = _.indexBy(users, 'id');
				});
			})


			function getProjects(query){
				Project.query(query || $scope.table.query, function(projects, h){
					$scope.projects = $scope.table.data = projects;
					$scope.table.pages = JSON.parse(h('pages'));
				});
			}
			$scope.$on('Project', function(){ getProjects(); });
			$scope.$watch('table.query', getProjects, true);


			// Export to CSV
			// -------------

			function download(uri, filename) {
				var link = document.createElement('a');
				if (typeof link.download !== 'string')
					return location.replace(uri);

				document.body.appendChild(link); //Firefox requires the link to be in the body
				link.download = filename;
				link.href = uri;
				link.click();
				document.body.removeChild(link); //remove the link when done
			}

			$scope.exportCSV = function(){


				// build the CSV
				// this is an egregious hack... we need something better
				var value = $('#projects-export-table table').children().map(function(i, group){
					return $(group).children().toArray().map(function(tr){
						return '"' + $(tr).children().toArray().map(function(td){
							return $(td).text().trim().replace(/"/g, '""');
						}).join('","') + '"';
					})
				}).toArray().join('\n');


				// download the file
				download('data:application/csv;charset=utf-8,' + encodeURIComponent(value), 'projects.csv');

			}




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
					Cycle.query({
						admin: true,
						search: search,
						sort: [{path: ['title']}],
						per_page: 20
					}).$promise.then(function(cycles){
						$scope.cycleSelect.data = cycles;
					});
				}
			};

			// save
			$scope.create = function() {
				$scope.projectCreate.$create({
					admin: true
				}).then(function(project) {

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
				Project.get({
						admin: true,
						id: $stateParams.project
					}).$promise.then(function(project){
					$scope.project = project;
					projectBackup = angular.copy(project);

					// get the cycle
					Cycle.get({
						admin: true,
						id: project.cycle_id
					}).$promise.then(function(cycle){
						$scope.cycle = cycle;
					});

					// get cycle roles
					Role.query({
						admin: true,
						cycle: project.cycle_id
					}).$promise.then(function(roles){
						$scope.roles = roles;
						$scope.rolesById = _.indexBy(roles, 'id');
					});

					// get cycle statuses
					Status.query({
						admin: true,
						cycle: project.cycle_id
					}).$promise.then(function(statuses){
						$scope.statuses = statuses;
						$scope.statusesById = _.indexBy(statuses, 'id');
					});

					// get cycle stages
					Stage.query({
						admin: true,
						cycle: project.cycle_id
					}).$promise.then(function(stages){
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
				$scope.projectEdit.$update({
					admin: true,
					id: $scope.project.id
				}).then(function(){
					$scope.projectEdit = null;
				});
			};

			$scope.updatePermissions = function(){
				new Project({permissions: $scope.project.permissions}).$update({
					admin: true,
					id: $scope.project.id
				}).then(function(){
					$scope.projectPermissionsEdit = false;
				});
			};

			$scope.updateSource = function(){
				new Project($scope.source.project).$update({
					admin: true,
					id: $scope.project.id
				}).then(function(){
					$scope.source.project = null;
				});
			};

			$scope.destroy = function(){
				if(!$window.confirm('Are you sure you want to delete this project?'))
					return;

				$scope.project.$delete({
					admin: true,
					id: $scope.project.id
				}).then(function(){
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

			function getProjectAssignments(){
				ProjectAssignment.query({
					admin: true,
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
				// TODO: we need to re-implement /projects/:project/users in the API!!!!
				User.query({
					admin: true,
					project: $stateParams.project
				}).$promise.then(function(users){
					$scope.users = users;
					$scope.usersById = _.indexBy(users, 'id');
				});

			}
			getUsers();
			$scope.$on('User', getUsers);
			$scope.$on('Project', getUsers);


			function getRoles(project){
				if(!project) return;
				$scope.roles = Role.query({
					admin: true,
					cycle: project.cycle_id
				});
			}
			$scope.$watch('project', getRoles);


			// Actions
			// -------

			$scope.save = function(assignment) {
				if(!assignment) return $window.alert('No assignment specified.');
				assignment.$save({
					admin: true,
					project: $scope.project.id,
					id: assignment.id
				});
			};

			$scope.update = function(assignment) {
				if(!assignment) return $window.alert('No assignment specified.');
				assignment.$update({
					admin: true,
					project: $scope.project.id,
					id: assignment.id
				});
			};

			$scope.delete = function(assignment) {
				if(!assignment) return $window.alert('No assignment specified.');
				if(!$window.confirm('Are you sure you want to delete this assignment?')) return;
				assignment.$delete({
					admin: true,
					project: $scope.project.id,
					id: assignment.id
				});
			};

			$scope.create = function() {
				if(!$scope.assignmentCreate.id || !$scope.assignmentCreate.id.length)
					return $window.alert('An ID must be set.');

				$scope.assignmentCreate.$save({
					admin: true,
					project: $scope.project.id,
					id: $scope.assignmentCreate.id
				}).then(function(){

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
				$scope.contents = Content.query({
					admin: true,
					project: $stateParams.project
				});
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
				if($scope.editVisibility) $scope.content.visible = angular.copy(backup.visible);
				$scope.editVisibility = !$scope.editVisibility;
			};

			$scope.editComponentPermissions = false;
			$scope.toggleComponentPermissions = function() {
				if($scope.editComponentPermissions) $scope.content.component.permissions = angular.copy(backup.component.permissions);
				$scope.editComponentPermissions = !$scope.editComponentPermissions;
			};


			// Get Resources
			// -------------

			function getContent(){
				Content.get({
					admin: true,
					project: $stateParams.project,
					id: $stateParams.content
				}).$promise.then(function(content){
					backup = angular.copy(content);
					$scope.content = content;
				});
			}
			getContent();
			$scope.$on('Project', getContent);

			function getStage(project){
				if(!project) return;
				Stage.get({
					admin: true,
					cycle: project.cycle_id,
					id: $stateParams.content
				}).$promise.then(function(stage){
					$scope.stage = stage;
					$scope.component = GandhiComponent[stage.component.name];
				});
			}
			$scope.$watch('project', getStage);


			// Actions
			// -------

			$scope.updateVisibility = function() {
				new Content({visible: $scope.content.visible}).$update({
					admin: true,
					id: $scope.content.id,
					project: $scope.project.id
				}).then(function(){
					$scope.editVisibility = false;
				});
			};

			$scope.updateComponentPermissions = function() {
				new Content({component: {permissions: $scope.content.component.permissions}}).$update({
					admin: true,
					id: $scope.content.id,
					project: $scope.project.id
				}).then(function(){
					$scope.editComponentPermissions = false;
				});
			};
		}]
	});

});
