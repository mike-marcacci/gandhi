angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('admin.users', {
			url: "/users",
			templateUrl: "admin/users/index.html",
			controller: function($scope, Restangular){
				$scope.users = Restangular.all('users').getList().$object;
			}
		})

		.state('admin.users.create', {
			url: "/create",
			templateUrl: "admin/users/create.html",
			controller: function($scope, Restangular, $state){

				// the model to edit
				$scope.userCreate = {};

				// save
				$scope.save = function(){
					Restangular.all('users').post($scope.userCreate).then(function(res){

						// update the local user
						$scope.users.push(res);

						// redirect
						$state.go('admin.users.user.show', {user: res.id});

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

		.state('admin.users.user', {
			url: "/:user",
			abstract: true,
			controller: function($scope, Restangular, $stateParams){
				$scope.$watchCollection('users', function(newValue, oldValue){
					$scope.users.some(function(user){
						if(user.id != $stateParams.user)
							return false;

						return $scope.user = user;
					});

					if($scope.user)
						$scope.projects = Restangular.one('users', $scope.user.id).getList('projects').$object;
				});

			},
			template: '<div ui-view></div>'
		})

		.state('admin.users.user.show', {
			url: "/show",
			templateUrl: "admin/users/user.show.html",
			controller: function($scope, Restangular, $state, $stateParams, $window){

				// delete the user
				$scope.delete = function(){
					if(!$window.confirm("Are you sure you want to delete this user?"))
						return;

					Restangular.one('users', $scope.user.id).remove().then(function(res){

						// remove user from list
						$scope.users.some(function(user, i){
							if(user.id != res.id)
								return false;

							return $scope.users.splice(i,1);
						})

						// redirect
						$state.go('admin.users');

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem performing the delete.");
					})
				}

			}
		})

		.state('admin.users.user.edit', {
			url: "/edit",
			templateUrl: "admin/users/user.edit.html",
			controller: function($scope, Restangular, $state, $stateParams){
				
				// the model to edit
				$scope.$watch('user', function(newValue, oldValue){
						$scope.userEdit = angular.copy(newValue);
				});

				// save
				$scope.save = function(){

					// don't save a blank password
					if($scope.userEdit.password == '')
						delete $scope.userEdit.password;

					Restangular.one('users', $stateParams.user).patch($scope.userEdit).then(function(res){

						// update the local user
						angular.extend($scope.user, res)

						// redirect
						$state.go('admin.users.user.show');


					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem saving your changes.");
					})
				}

			}
		})

});