	angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('portal.admin.cycles', {
			url: "/cycles",
			abstract: true,
			template: "<div ui-view></div>",
			controller: ['$scope', 'Cycle', function($scope, Cycle){
				$scope.table = {
					query: {
						sort: [{path: ['title'], direction: 'asc'}]
					},
					pages: {},
					columns: [
						{primary: true, title: 'Title', path: ['title']},
						{primary: true, title: 'Status', path: ['status']},
						{primary: false, title: 'Created', path: ['created']},
						{primary: false, title: 'Updated', path: ['updated']}
					]
				};

				function getList(query){
					$scope.cycles = $scope.table.data = Cycle.query(query || $scope.table.query, function(cycles, h){
						$scope.table.pages = JSON.parse(h('pages'));
					});
				}

				$scope.$on('cycles', function(){ getList(); });
				$scope.$watch('table.query', getList, true);
			}]
		})

		.state('portal.admin.cycles.list', {
			url: "",
			templateUrl: "portal/admin/cycles/list.html"
		})

		.state('portal.admin.cycles.create', {
			url: "/create",
			templateUrl: "portal/admin/cycles/create.html",
			controller: function($scope, $rootScope, Restangular, $state){

				// the model to edit
				$scope.cycleSource = JSON.stringify({title: ""}, null, '\t');

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

				function getObject(){
					if(!$stateParams.cycle)
						return;

					Restangular.all('cycles').get($stateParams.cycle).then(function(res){
						$scope.cycle = res.data;
						$scope.cycleEdit = Object.create($scope.cycle);
						$scope.cycleSource = JSON.stringify(Restangular.stripRestangular($scope.cycle), null, '\t');
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
					$scope.cycle.patch($scope.cycleEdit).then(function(res){

						// update the local lists
						$rootScope.$broadcast('cycles');

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

		.state('portal.admin.cycles.show.flow', {
			url: '/flow',
			templateUrl: 'portal/admin/cycles/show.flow.html',
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
							$state.go('portal.admin.cycles.show.flow.stage', {stage: stage.id});
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

		.state('portal.admin.cycles.show.flow.stage', {
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

		.state('portal.admin.cycles.show.users', {
			url: '/users',
			templateUrl: "portal/admin/cycles/show.users.html",
			controller: function ($scope, $state, $stateParams, Restangular) {

			}
		})

});
