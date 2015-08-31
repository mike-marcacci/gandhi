angular.module('gandhi')

.config(['$stateProvider', function($stateProvider) {
	'use strict';

	$stateProvider

	.state('portal.projects', {
		url: '/projects',
		template: '<div ui-view></div>',
		abstract: true,
		controller: ['$scope', '$state', '$stateParams', 'Cycle', 'Project', function($scope, $state, $stateParams, Cycle, Project) {

			// scope for custom table templates
			$scope.listScope = {};

			$scope.table = {
				query: {
					sort: [{path: ['title'], direction: 'asc'}]
				},
				pages: {},
				columns: [
					{sortable: true,  title: 'Title',   path: ['title'],          flex: 4, template: '<a ui-sref="portal.projects.show({project: row.id})" ng-click="$event.stopPropagation()">{{value}}</a>'},
					{sortable: true,  title: 'Cycle',   path: ['cycle_id'],       flex: 3, template: '<a ui-sref="portal.cycles.show({cycle: value})" ng-click="$event.stopPropagation()">{{scope.cyclesById[value].title}}</a>'},
					{sortable: true,  title: 'Role',    path: ['role','title'],   flex: 1, template: null},
					{sortable: true,  title: 'Status',  path: ['status','title'], flex: 1, template: null},
					{sortable: true,  title: 'Created', path: ['created'],        flex: 2, template: '{{row.created * 1000 | date:"yyyy.MM.dd - hh:mm a"}}'},
					{sortable: true,  title: 'Updated', path: ['updated'],        flex: 2, template: '{{row.updated * 1000 | date:"yyyy.MM.dd - hh:mm a"}}'},
				]
			};

			// filter by cycle
			$scope.cycleSelect = {
				data: [],
				search: function(search){
					Cycle.query({
						search: search,
						sort: [{path: ['title']}],
						per_page: 20
					}).$promise.then(function(cycles){
						$scope.cycleSelect.data = cycles;
					});
				}
			};

			// perform secondary requests
			$scope.cycleIds = [];
			$scope.$watch('projects', function(projects){
				if(!projects || !projects.length) return;

				// get cycles
				var cycleIds = _.unique(_.pluck(projects,'cycle_id'));
				if(!_.isEqual(cycleIds, $scope.cycleIds))
					$scope.cycleIds = cycleIds;
			});

			// get all shown cycles
			$scope.$watch('cycleIds', function(cycleIds){
				if(!cycleIds || !cycleIds.length) return;
				
				Cycle.query({filter: [{op: 'in', path: '/id', value: cycleIds}], includes: ['roles']}).$promise.then(function(cycles){
					$scope.listScope.cycles = cycles;
					$scope.listScope.cyclesById = _.indexBy(cycles, 'id');
				});
			});


			// Tabs
			// ----
			
			$scope.setAssignedOnly = function(assignedOnly){
				$scope.assignedOnly = !!assignedOnly;

				// restrict to assigned projects
				if(assignedOnly) {
					delete $scope.table.query.filter;
					$scope.table.query.user = $scope.currentUser.id;
				}

				// restrict to projects with an actual role
				else {
					delete $scope.table.query.user;
				}
			};

			// set default
			$scope.setAssignedOnly(true);



			// Get Resources
			// -------------

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

	.state('portal.projects.list', {
		url: '',
		templateUrl: 'portal/projects/list.html'
	})

	.state('portal.projects.show', {
		url: '/show/:project',
		templateUrl: 'portal/projects/show.html',
		controller: ['$scope', '$state', '$stateParams', '$window', 'Project', 'Cycle', 'Role', 'Status', 'Stage', 'Content', function($scope, $state, $stateParams, $window, Project, Cycle, Role, Status, Stage, Content){
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

					// get the roles
					Role.query({cycle: project.cycle_id}).$promise.then(function(roles){
						$scope.roles = roles;
						$scope.rolesById = _.indexBy(roles, 'id');
					});

					// get the statuses
					Status.query({cycle: project.cycle_id}).$promise.then(function(statuses){
						$scope.statuses = statuses;
						$scope.statusesById = _.indexBy(statuses, 'id');
					});

					// get the stages
					Stage.query({cycle: project.cycle_id}).$promise.then(function(stages){
						$scope.stages = stages;
						$scope.stagesById = _.indexBy(stages, 'id');
					});
				});

				// get the contents
				Content.query({project: $stateParams.project}).$promise.then(function(contents){
					$scope.contents = contents;
					$scope.contentsById = _.indexBy(contents, 'id');

					// redirect to content
					if($state.is('portal.projects.show'))
						$state.go('portal.projects.show.contents.content', {content: contents[contents.length - 1].id});

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

	.state('portal.projects.show.contents', {
		url: '/contents',
		template: '<div ui-view></div>',
		abstract: true
	})

	.state('portal.projects.show.contents.content', {
		url: '/:content',
		template: '<div gandhi-component="context"></div>',
		controller: ['$scope', '$state', '$stateParams', 'GandhiComponent', 'Content', 'Stage', function($scope, $state, $stateParams, GandhiComponent, Content, Stage) {

			// build context
			$scope.context = {
				cycle: $scope.cycle,
				project: $scope.project,
				stage: $scope.stage,
				content: null,
				mode: 'default'
			};

			$scope.$watchCollection('{cycle: cycle, project: project, stage: stage}', function(collection) {
				$scope.context.cycle   = collection.cycle;
				$scope.context.project = collection.project;
				$scope.context.stage   = collection.stage;
			});


			$scope.component = null;
			var backup = null;


			// Get Resources
			// -------------

			function getContent(){
				Content.get({project: $stateParams.project, id: $stateParams.content}).$promise.then(function(content){
					backup = angular.copy(content);
					$scope.context.content = content;
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
			$scope.$on('Cycle', getContent);


			// Actions
			// -------

			$scope.updateVisibility = function() {
				new Content({visible: $scope.context.content.visible}).$update({id: $scope.context.content.id, project: $scope.project.id}).then(function(){
					$scope.editVisibility = false;
				});
			};

			$scope.updateComponentPermissions = function() {
				new Content({component: {permissions: $scope.context.content.component.permissions}}).$update({id: $scope.context.content.id, project: $scope.project.id}).then(function(){
					$scope.editComponentPermissions = false;
				});
			};
		}]
	});

}]);
