angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('portal.admin.projects', {
			url: '/projects',
			abstract: true,
			template: '<div ui-view></div>',
			controller: function($scope, Restangular){
				$scope.projects = null;
				$scope.table = {
					query: {
						sort: '[\'title\']',
						filter: {}
					},
					pages: {},
					data: $scope.projects,
					columns: [
						{primary: true, title: 'Title', key: 'title'},
						{primary: true, title: 'Status', key: 'status'},
						{primary: false, title: 'Created', key: 'created'},
						{primary: false, title: 'Updated', key: 'updated'},
						{primary: false, title: 'Application Status', key: 'flow.application.status'}
					]
				};

				// new user assignment
				$scope.constraints = {
					cycles: null,
					cycle: null,
					searchCycles: function(search){
						Restangular.all('cycles').getList({search: search, sort: 'title', per_page: 20}).then(function(res){
							$scope.constraints.cycles = res.data;
						});
					},
					users: null,
					user: null,
					searchUsers: function(search){
						Restangular.all('users').getList({search: search, sort: 'title', per_page: 20}).then(function(res){
							$scope.constraints.users = res.data;
						});
					}
				};

				$scope.$watch('constraints.cycle', function(cycle){
					if(!cycle)
						return $scope.table.query.filter.cycle_id = {eq: null};

					$scope.table.query.filter.cycle_id = {eq: cycle.id};
				});

				$scope.$watch('constraints.user', function(user){
					if(!user)
						return delete $scope.table.query.user;

					$scope.table.query.user = user.id;
				});

				function getList(query){
					query = query || $scope.table.query;

					Restangular.all('projects').getList(query).then(function(res){
						$scope.table.data = $scope.projects = res.data;
						$scope.table.pages = JSON.parse(res.headers('Pages'));
					});
				}

				$scope.$on('Project', function(){ getList(); });
				$scope.$watch('table.query', getList, true);
			}
		})

		.state('portal.admin.projects.list', {
			url: '',
			templateUrl: 'portal/admin/projects/list.html',
			controller: function($scope, Restangular){

			}
		})

		.state('portal.admin.projects.create', {
			url: '/create',
			templateUrl: 'portal/admin/projects/create.html',
			controller: function($scope, $rootScope, Restangular, $state){

				// the model to edit
				$scope.projectCreate = JSON.stringify({title: '', cycle_id: ''}, null, '\t');

				// save
				$scope.create = function(){
					var value;

					// parse the string
					try {
						value = JSON.parse($scope.projectCreate);
					} catch (e){
						return alert('There\'s an error in your JSON syntax.');
					}

					$scope.projects.post(value).then(function(res){

						// update the local lists
						$rootScope.$broadcast('projects');

						// redirect
						$state.go('portal.admin.projects.show', {project: res.data.id});

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert('There was a problem saving your changes.');
					})
				}

			}
		})

		.state('portal.admin.projects.show', {
			url: '/show/:project',
			templateUrl: 'portal/admin/projects/show.html',
			controller: function($scope, $rootScope, Restangular, $state, $stateParams, $window, uuid){
				$scope.source = false;
				$scope.toggleSource = function(){
					$scope.source = !$scope.source;
				}

				// open up invitation
				$scope.mailInvitation = function(invitation) {
					return 'mailto:'+invitation.email
					+ '?Subject=Invitation to %22'+encodeURIComponent($scope.project.title)+'%22'
					+ '&Body='+encodeURIComponent('Hi '+invitation.name+',\n\n'
						+ 'You are being invited to join the project "' + $scope.project.title + '" with the role of '+$scope.cycle.roles[invitation.role].title + '.\n\n'
						+ 'Please sign up for an account at ' + $window.location.protocol+'//' + $window.location.host + $window.location.pathname + ' then use the following invitation code to join the project:\n\n'
						+ $scope.project.id + ':' + invitation.id + '\n\n'
						+ 'Thank you for your help, and please let us know if you have any questions!'
					)
				};

				// invitation removal
				$scope.removeInvitation = function(id) {
					if(!id)
						return alert('No invitation was selected.');

					if(!confirm('Are you sure you want to remove the invitation ' + ($scope.users[id] ? $scope.users[id].name : id) + '?'))
						return;

					var data = {invitations: {}}; data.invitations[id] = null;
					$scope.project.patch(data).then(function(res){

						// update the local lists
						$rootScope.$broadcast('projects');

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem saving your changes.");
					});
				};

				// new invitation assignment
				$scope.newInvitation = {
					name: null,
					email: null,
					role: null,
					roles: [],
					// assign a new invitation to the project
					submit: function(){
						if(!$scope.newInvitation.name || !$scope.newInvitation.role)
							return alert('You must provide a name and choose a role.');

						// generate new uuid
						var id = uuid();
						console.log(id)

						var data = {invitations: {}}; data.invitations[id] = {id: id, name: $scope.newInvitation.name, email: $scope.newInvitation.email, role: $scope.newInvitation.role.id};
						$scope.project.patch(data).then(function(res){

							// reset the form
							$scope.newInvitation.name = null;
							$scope.newInvitation.email = null;
							$scope.newInvitation.role = null;

							// update the local lists
							$rootScope.$broadcast('projects');

						}, function(err){
							if(err.data && err.data.message)
								alert(err.data.message);
							else
								alert("There was a problem saving your changes.");
						});
					}
				}

				// notify the user
				$scope.mailAssignment = function(assignment) {
					var user = $scope.users[assignment.id] || {};
					document.location = 'mailto:'+user.email
					+ '?Subject=Assignment to %22'+encodeURIComponent($scope.project.title)+'%22'
					+ '&Body='+encodeURIComponent('Hi '+user.name+',\n\n'
						+ 'You have been assigned to the project "' + $scope.project.title + '" with the role of '+$scope.cycle.roles[assignment.role].title + '.\n\n'
						+ 'You can access this project at ' + $window.location.protocol+'//' + $window.location.host + $window.location.pathname + '#/projects/show/' + $scope.project.id + ' .\n\n'
						+ 'Thank you for your help, and please let us know if you have any questions!'
					)
				};

				// user removal
				$scope.removeUser = function(id) {
					if(!id)
						return alert('No user was selected.');

					if(!confirm('Are you sure you want to remove ' + ($scope.users[id] ? $scope.users[id].name : id) + '?'))
						return;

					var data = {users: {}}; data.users[id] = null;
					$scope.project.patch(data).then(function(res){

						// update the local lists
						$rootScope.$broadcast('projects');

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem saving your changes.");
					});
				}

				// new user assignment
				$scope.newUser = {
					user: null,
					role: null,
					users: [],
					roles: [],
					// filter out users who are already part of the project
					filter: function(u){
						return $scope.projectUserIds.indexOf(u.id) === -1;
					},
					// search for possible users
					search: function(search){
						Restangular.all('users').getList({search: search, sort: 'name', per_page: 20}).then(function(res){
							$scope.newUser.users = res.data;
						});
					},
					// assign a new user to the 
					submit: function(){
						if(!$scope.newUser.user || !$scope.newUser.role)
							return alert('You must choose a user and a role.');

						var data = {users: {}}; data.users[$scope.newUser.user.id] = {id: $scope.newUser.user.id, role: $scope.newUser.role.id};
						$scope.project.patch(data).then(function(res){

							// reset the form
							$scope.newUser.user = null;
							$scope.newUser.role = null;

							// update the local lists
							$rootScope.$broadcast('projects');

						}, function(err){
							if(err.data && err.data.message)
								alert(err.data.message);
							else
								alert("There was a problem saving your changes.");
						});
					}
				}

				function getObject(){
					if(!$stateParams.project)
						return;

					Restangular.all('projects').get($stateParams.project).then(function(res){
						$scope.project = res.data;
						$scope.projectEdit = Object.create($scope.project);
						$scope.projectSource = JSON.stringify(Restangular.stripRestangular($scope.project), null, '\t');
						$scope.projectUserIds = Object.keys($scope.project.users);
					});
					Restangular.one('projects', $stateParams.project).getList('users').then(function(res){
						$scope.users = _.indexBy(res.data, 'id');
					});
					Restangular.one('projects', $stateParams.project).one('cycle').get().then(function(res){
						$scope.cycle = res.data;
						$scope.cycleUserIds = Object.keys($scope.cycle.users);
						$scope.newUser.roles = _.toArray($scope.cycle.roles);
						$scope.newInvitation.roles = _.toArray($scope.cycle.roles);
					});
				}

				getObject();
				$scope.$on('Project', getObject);

				// update the project
				$scope.update = function(){

					$scope.project.patch($scope.projectEdit).then(function(res){

						// update the local lists
						$rootScope.$broadcast('projects');

						// redirect
						// $scope.edit = false;
						alert('Changes successfully saved.');

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem saving your changes.");
					})
				}

				// update the project
				$scope.replace = function(){
					var value;

					// parse the string
					try {
						value = JSON.parse($scope.projectSource);
					} catch (e){
						return alert('There\'s an error in your JSON syntax.');
					}

					$scope.project.customPUT(value).then(function(res){

						// update the local lists
						$rootScope.$broadcast('projects');

						// redirect
						$scope.source = false;


					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert('There was a problem saving your changes.');
					})
				}


				// delete the project
				$scope.destroy = function(){
					if(!$window.confirm('Are you sure you want to delete this project?'))
						return;

					$scope.project.remove().then(function(res){

						// update the local lists
						$rootScope.$broadcast('projects');

						// redirect
						$state.go('portal.admin.projects.list');

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert('There was a problem performing the delete.');
					})
				}

			}
		})

		.state('portal.admin.projects.show.flow', {
			url: '/flow',
			templateUrl: 'portal/admin/projects/show.flow.html',
			abstract: true,
			controller: function ($scope, $state, $stateParams, Restangular, $rootScope) {
				$scope.edit = false;
				$scope.toggleEdit = function(){
					$scope.edit = !$scope.edit;
				};

				$scope.updateStage = function(){
					if(!$scope.stageEdit || !$scope.cycle)
						return alert('Unable to save.');

					return alert('There\'s a bug in this, so it is temporarily disabled');

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
							alert(err.data.message);
						else
							alert("There was a problem saving your changes.");
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
							$state.go('portal.admin.projects.show.flow.stage', {stage: stage.id});
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

		.state('portal.admin.projects.show.flow.stage', {
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

		.state('portal.admin.projects.show.users', {
			url: '/users',
			templateUrl: "portal/admin/projects/show.users.html",
			controller: function ($scope, $state, $stateParams, Restangular) {

			}
		})

});
