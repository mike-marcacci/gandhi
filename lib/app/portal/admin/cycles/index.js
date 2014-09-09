	angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('portal.admin.cycles', {
			url: "/cycles",
			abstract: true,
			template: "<div ui-view></div>",
			controller: function($scope, Restangular){
				$scope.cycles = null;
				$scope.table = {
					query: {
						sort: '[\'title\']'
					},
					pages: {},
					data: $scope.cycles,
					columns: [
						{primary: true, title: 'Title', key: 'title'},
						{primary: true, title: 'Status', key: 'status'},
						{primary: false, title: 'Created', key: 'created'},
						{primary: false, title: 'Updated', key: 'updated'}
					]
				};

				function getList(query){
					Restangular.all('cycles').getList(query || $scope.table.query).then(function(res){
						$scope.table.data = $scope.cycles = res.data;
						$scope.table.pages = JSON.parse(res.headers('Pages'));
					});
				}

				$scope.$on('cycles', function(){ getList(); });
				$scope.$watch('table.query', getList, true);
			}
		})

		.state('portal.admin.cycles.list', {
			url: "",
			templateUrl: "portal/admin/cycles/list.html",
			controller: function($scope, Restangular){

			}
		})

		.state('portal.admin.cycles.create', {
			url: "/create",
			templateUrl: "portal/admin/cycles/create.html",
			controller: function($scope, $rootScope, Restangular, $state){

				// the model to edit
				$scope.cycleSource = JSON.stringify({title: ""}, null, 2);

				// save
				$scope.create = function(){
					var value;

					// parse the string
					try {
						value = JSON.parse($scope.cycleSource);
					} catch (e){
						return alert("There's an error in your JSON syntax.");
					}

					$scope.cycles.post(value).then(function(res){

						// update the local lists
						$rootScope.$broadcast('cycles');

						// redirect
						$state.go('portal.admin.cycles.show', {cycle: res.data.id});

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem saving your changes.");
					})
				}

			}
		})

		.state('portal.admin.cycles.show', {
			url: "/show/:cycle",
			templateUrl: "portal/admin/cycles/show.html",
			controller: function($scope, $rootScope, Restangular, $state, $stateParams, $window){
				$scope.edit = false;
				$scope.toggleEdit = function(){
					$scope.edit = !$scope.edit;
				};

				$scope.source = false;
				$scope.toggleSource = function(){
					$scope.source = !$scope.source;
				};

				// user removal
				$scope.removeUser = function(id) {
					if(!id)
						return alert('No user was selected.');

					if(!confirm('Are you sure you want to remove ' + ($scope.users[id] ? $scope.users[id].name : id) + '?'))
						return;

					var data = {users: {}}; data.users[id] = null;
					$scope.cycle.patch(data).then(function(res){

						// update the local lists
						$rootScope.$broadcast('cycles');

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
					// filter out users who are already part of the cycle
					filter: function(u){
						return Object.keys($scope.users).indexOf(u.id) === -1;
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
						$scope.cycle.patch(data).then(function(res){

							// reset the form
							$scope.newUser.user = null;
							$scope.newUser.role = null;

							// update the local lists
							$rootScope.$broadcast('cycles');

						}, function(err){
							if(err.data && err.data.message)
								alert(err.data.message);
							else
								alert("There was a problem saving your changes.");
						});
					}
				}

				// options for the waterfall chart
				$scope.waterfallOptions = {
					"hide": false,
					"node": {
						"width": 160,
						"height": 26,
						"margin": {
							"x": 10,
							"y": 5
						}
					}
				};

				function getObject(){
					if(!$stateParams.cycle)
						return;

					Restangular.all('cycles').get($stateParams.cycle).then(function(res){
						$scope.cycle = res.data;
						$scope.cycleEdit = Object.create($scope.cycle);
						$scope.cycleSource = JSON.stringify(Restangular.stripRestangular($scope.cycle), null, 2);
						$scope.newUser.roles = _.toArray($scope.cycle.roles);
					});
					Restangular.one('cycles', $stateParams.cycle).getList('projects').then(function(res){
						$scope.projects = res.data;
					});
					Restangular.one('cycles', $stateParams.cycle).getList('users').then(function(res){
						$scope.users = _.indexBy(res.data, 'id');
					});
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
						return alert("There's an error in your JSON syntax.");
					}

					$scope.cycle.customPUT(value).then(function(res){

						// update the local lists
						$rootScope.$broadcast('cycles');

						// redirect
						$scope.source = false;

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem saving your changes.");
					})
				}

				// update the cycle
				$scope.update = function(){
					var value;

					// parse the string
					try {
						value = JSON.parse($scope.cycleSource);
					} catch (e){
						return alert("There's an error in your JSON syntax.");
					}

					$scope.cycle.customPUT(value).then(function(res){

						// update the local lists
						$rootScope.$broadcast('cycles');

						// redirect
						$scope.source = false;

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem saving your changes.");
					})
				}


				// delete the cycle
				$scope.destroy = function(){
					if(!$window.confirm("Are you sure you want to delete this cycle?"))
						return;

					$scope.cycle.remove().then(function(res){

						// update the local lists
						$rootScope.$broadcast('cycles');

						// redirect
						$state.go('portal.admin.cycles.list');

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem performing the delete.");
					})
				}
			}
		})

});
