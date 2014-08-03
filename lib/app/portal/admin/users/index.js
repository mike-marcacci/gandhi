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
			controller: function($scope, Restangular, $state, $stateParams, $window){
				$scope.edit = false;
				$scope.toggleEdit = function(){
					$scope.edit = !$scope.edit;
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
						if(newValue) $scope.userEdit = Object.create(newValue);
				});

				// update the user
				$scope.update = function(){

					// don't save a blank password
					if($scope.userEdit.password == '')
						delete $scope.userEdit.password;

					$scope.user.patch($scope.userEdit).then(function(res){

						// update the local user
						angular.extend($scope.user, res)

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

						// remove user from list
						$scope.users.some(function(user, i){
							if(user.id != res.id)
								return false;

							return $scope.users.splice(i,1);
						})

						// redirect
						$state.go('portal.admin.users.list');

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
