angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('portal.admin.users', {
			url: "/users",
			abstract: true,
			template: "<div ui-view></div>",
			controller: function($scope, Restangular){
				$scope.query = {};
				$scope.users = Restangular.all('users').getList().$object;

				$scope.$on('users', function(){
					$scope.users = $scope.users.getList().$object;
				});
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
			controller: function($scope, Restangular, $state){

				// the model to edit
				$scope.userCreate = {};

				// save
				$scope.create = function(){
					$scope.users.post($scope.userCreate).then(function(res){

						// update the local user
						$scope.users.push(res);

						// redirect
						$state.go('portal.admin.users.show', {user: res.id});

					}, function(err){
						console.log(err)
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

				$scope.$watchCollection('users', function(newValue, oldValue){
					$scope.users.some(function(user){
						if(user.id != $stateParams.user)
							return false;

						return $scope.user = user;
					});

					if($scope.user)
						$scope.projects = $scope.user.getList('projects').$object;
				});


				// the model to edit
				$scope.$watch('user', function(newValue, oldValue){
						if(!newValue) return;
						$scope.userEdit = Object.create(newValue);
						$scope.userSource = JSON.stringify(Restangular.stripRestangular(newValue), null, 2);
				}, true);

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
					Restangular.all('tokens').post({email: $scope.user.email}).then(function(){
						alert('Recovery token successfully sent.');
					}, function(err){
						alert('There was an error sending a recovery token.');
					})
				}

			}
		})

});
