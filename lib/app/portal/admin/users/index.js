angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('portal.admin.users', {
			url: "/users",
			abstract: true,
			template: "<div ui-view></div>",
			controller: function($scope, Restangular){
				$scope.users = null;
				$scope.table = {
					query: {
						sort: '[\'name\']'
					},
					pages: {},
					data: $scope.users,
					columns: [
						{primary: true, title: ' ', key: 'admin', template: '<td><span class="glyphicon glyphicon-star" ng-show="row.admin"></span></td>'},
						{primary: true, title: 'Name', key: 'name'},
						{primary: false, title: 'Email', key: 'email'},
						{primary: false, title: 'Created', key: 'created'},
						{primary: false, title: 'Updated', key: 'updated'}
					]
				};

				function getList(query){
					Restangular.all('users').getList(query || $scope.table.query).then(function(res){
						$scope.table.data = $scope.users = res.data;
						$scope.table.pages = JSON.parse(res.headers('Pages'));
					});
				}

				$scope.$on('users', function(){ getList(); });
				$scope.$watch('table.query', getList, true);
			}
		})

		.state('portal.admin.users.list', {
			url: "",
			templateUrl: "portal/admin/users/list.html",
			controller: function($scope, Restangular){

			}
		})

		.state('portal.admin.users.create', {
			url: "/create",
			templateUrl: "portal/admin/users/create.html",
			controller: function($scope, Restangular, $state, $rootScope){

				// the model to edit
				$scope.userCreate = {};

				// save
				$scope.create = function(){
					$scope.users.post($scope.userCreate).then(function(res){

						// update the local lists
						$rootScope.$broadcast('users');

						// redirect
						$state.go('portal.admin.users.show', {user: res.data.id});

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem saving your changes.");
					})
				}

			}
		})

		.state('portal.admin.users.show', {
			url: "/show/:user",
			templateUrl: "portal/admin/users/show.html",
			controller: function($scope, $rootScope, Restangular, $state, $stateParams, $window, auth){
				$scope.edit = false;
				$scope.toggleEdit = function(){
					$scope.edit = !$scope.edit;
				}

				$scope.source = false;
				$scope.toggleSource = function(){
					$scope.source = !$scope.source;
				}

				function getObject(){
					if(!$stateParams.user)
						return;

					Restangular.one('users', $stateParams.user).get().then(function(res){
						$scope.user = res.data;
						$scope.userEdit = Object.create($scope.user);
						$scope.userSource = JSON.stringify(Restangular.stripRestangular($scope.user), null, 2);
					});
					Restangular.one('users', $stateParams.user).getList('projects').then(function(res){
						$scope.projects = res.data;
					});
					Restangular.one('users', $stateParams.user).getList('files').then(function(res){
						$scope.files = res.data;
					});
				}

				getObject();
				$scope.$on('users', getObject);

				// replace the project
				$scope.replace = function(){
					var value;

					// parse the string
					try {
						value = JSON.parse($scope.userSource);
					} catch (e){
						return alert("There's an error in your JSON syntax.");
					}

					$scope.user.customPUT(value).then(function(res){

						// update the local lists
						$rootScope.$broadcast('users');

						// redirect
						$scope.source = false;

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem saving your changes.");
					})
				}

				// update the user
				$scope.update = function(){

					// don't save a blank password
					if($scope.userEdit.password == '')
						delete $scope.userEdit.password;

					$scope.user.patch($scope.userEdit).then(function(res){

						// update the local lists
						$rootScope.$broadcast('users');

						// redirect
						$scope.edit = false;


					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem saving your changes.");
					})
				}


				// delete the user
				$scope.destroy = function(){
					if(!$window.confirm("Are you sure you want to delete this user?"))
						return;

					$scope.user.remove().then(function(res){

						// update the local lists
						$rootScope.$broadcast('users');

						// redirect
						$state.go('portal.admin.users.list');

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem performing the delete.");
					})
				}


				// become the user
				$scope.become = function(){
					if(!$window.confirm("Are you sure you want to log in as this user?"))
						return;

					auth.login({email: $scope.user.email, token: $window.localStorage.token}).then(function(){
						$state.go('portal.dashboard');
					})
				}


				// send the user a recovery token
				$scope.recover = function(){
					Restangular.all('tokens').post({email: $scope.user.email}).then(function(res){
						alert('Recovery token successfully sent.');
					}, function(err){
						alert('There was an error sending a recovery token.');
					})
				}

			}
		})

});
