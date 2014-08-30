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
						sort: '[\'title\']'
					},
					pages: {},
					data: $scope.projects,
					columns: [
						{primary: true, title: 'Title', key: 'title'},
						{primary: true, title: 'Status', key: 'status'},
						{primary: false, title: 'Created', key: 'created'},
						{primary: false, title: 'Updated', key: 'updated'}
					]
				};

				function getList(query){
					Restangular.withConfig(function(RestangularConfigurer) {
						RestangularConfigurer.setFullResponse(true);
					}).all('projects').getList(query || $scope.query).then(function(res){
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
				$scope.projectCreate = JSON.stringify({title: ''}, null, 2);

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
			controller: function($scope, $rootScope, Restangular, $state, $stateParams, $window){
				$scope.source = false;
				$scope.toggleSource = function(){
					$scope.source = !$scope.source;
				}

				// user removal
				$scope.removeUser = function(id) {
					if(!id)
						return alert('No user was selected.');

					if(!confirm('Are you sure you want to remove ' + ($scope.users[id] ? $scope.users[id].name : id) + '?'))
						return;

					var data = {users: {}}; data.users[id] = true;
					Restangular.all('projects').customDELETE($scope.project.id, null, null, data).then(function(res){

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
						$scope.projectSource = JSON.stringify(Restangular.stripRestangular($scope.project), null, 2);
						$scope.projectUserIds = Object.keys($scope.project.users);
					});
					Restangular.one('projects', $stateParams.project).getList('users').then(function(res){
						$scope.users = _.indexBy(res.data, 'id');
					});
					Restangular.one('projects', $stateParams.project).one('cycle').get().then(function(res){
						$scope.cycle = res.data;
						$scope.cycleUserIds = Object.keys($scope.cycle.users);
						$scope.newUser.roles = _.toArray($scope.cycle.roles);
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

					Restangular.all('projects').customDELETE($scope.project.id, null, null, null).then(function(res){

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
