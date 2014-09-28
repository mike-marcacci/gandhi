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
						{primary: false, title: 'Application Status', key: 'flow.application.status'},
						{primary: false, title: 'Report Status', key: 'flow.report.status'}
					]
				};

				// new user assignment
				$scope.constraints = {
					cycles: null,
					cycle: null,
					filters: {},
					// search for possible cycles
					search: function(search){
						Restangular.all('cycles').getList({search: search, sort: 'title', per_page: 20}).then(function(res){
							$scope.constraints.cycles = res.data;
						});
					}
				}

				$scope.$watch('constraints.cycle', function(cycle){
					if(!cycle)
						return delete $scope.table.query.filter.cycle_id;

					$scope.table.query.filter['[cycle_id][eq]'] = cycle.id;
				})

				function getList(query){
					query = query || $scope.table.query;

					var q = {
						sort: query.sort,
						search: query.search
					};

					_.each(query.filter, function(v,k){
						q['filter'+k] = v;
					})

					Restangular.all('projects').getList(q).then(function(res){
						$scope.table.data = $scope.projects = res.data;
						$scope.table.pages = JSON.parse(res.headers('Pages'));
					});
				}

				$scope.$on('projects', function(){ getList(); });
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
				}

				// new invitation assignment
				$scope.newInvitation = {
					name: null,
					role: null,
					roles: [],
					// assign a new invitation to the project
					submit: function(){
						if(!$scope.newInvitation.name || !$scope.newInvitation.role)
							return alert('You must choose a user and a role.');

						// generate new uuid
						var id = uuid();
						console.log(id)

						var data = {invitations: {}}; data.invitations[id] = {id: id, name: $scope.newInvitation.name, role: $scope.newInvitation.role.id};
						$scope.project.patch(data).then(function(res){

							// reset the form
							$scope.newInvitation.name = null;
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
				$scope.$on('projects', getObject);

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

});
