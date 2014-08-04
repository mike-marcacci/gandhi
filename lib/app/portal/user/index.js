angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('portal.user', {
			url: "/user",
			abstract: true,
			template: '<div ui-view></div>'
		})

		.state('portal.user.show', {
			url: "/show",
			templateUrl: "portal/user/show.html",
			controller: function($scope, Restangular, $state, $stateParams, $window){
				$scope.edit = false;
				$scope.toggleEdit = function(){
					$scope.edit = !$scope.edit;
				}

				$scope.user = $scope.currentUser;

				// the model to edit
				$scope.$watch('currentUser', function(newValue, oldValue){
						if(newValue) $scope.userEdit = Object.create(newValue);
				});

				// update the user
				$scope.update = function(){

					// don't save a blank password
					if($scope.userEdit.password == '')
						delete $scope.userEdit.password;

					$scope.currentUser.patch($scope.userEdit).then(function(res){

						// update the local user
						angular.extend($scope.currentUser, Restangular.stripRestangular(res))

						// redirect
						$scope.edit = false;

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
