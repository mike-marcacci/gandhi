angular.module('gandhi')

.config(['$stateProvider', function($stateProvider) {

	$stateProvider
		.state('portal.user', {
			url: "/user",
			abstract: true,
			template: '<div ui-view></div>'
		})

		.state('portal.user.show', {
			url: "/show",
			templateUrl: "portal/user/show.html",
			controller: ['$scope', 'User', function($scope, User){
				$scope.edit = false;
				$scope.toggleEdit = function(){
					$scope.edit = !$scope.edit;
				}

				// the model to edit
				$scope.$watch('currentUser', function(currentUser){
						if(!currentUser) return;
						$scope.user = currentUser;
						$scope.userEdit = new User(currentUser);
				});

				// update the user
				$scope.update = function(){

					// don't save a blank password
					if($scope.userEdit.password == '')
						delete $scope.userEdit.password;

					$scope.userEdit.$update({id: $scope.currentUser.id}).then(function(user){

						// update the local user
						angular.extend($scope.currentUser, user);

						// redirect
						$scope.edit = false;

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem saving your changes.");
					})
				}
			}]
		})

}]);
