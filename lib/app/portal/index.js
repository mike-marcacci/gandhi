angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {
	$stateProvider
		.state('portal', {
			url: "",
			templateUrl: "portal/index.html",
			abstract: true,
			resolve: {},
			controller: function($scope, Restangular){
				$scope.projects = [];

				// current user
				$scope.$watch('currentUser', function(currentUser) {
					if(!currentUser || !currentUser.id) return;

					// get the current user's projects
					currentUser.getList('projects').then(function(res){
						$scope.projects = res.data;
					});
				});
			}
		})
		.state('portal.dashboard', {
			url: "/",
			templateUrl: "portal/dashboard.html",
			controller: function($scope, $rootScope, $state, Restangular){
				$scope.invitationCode = '';
				$scope.acceptInvitation = function(){
					var parsed = decodeURIComponent($scope.invitationCode).split(':');
					if(parsed.length !== 2)
						return alert('Sorry, but that code is an invalid format.');

					var data = {users: {}}; data.users[$scope.currentUser.id] = {
						id: $scope.currentUser.id,
						invitation_id: parsed[1]
					}
					Restangular.one('projects', parsed[0]).patch(data).then(function(res){
						
						// update the local lists
						$rootScope.$broadcast('projects');

						// redirect
						$state.go('portal.projects.show', {project: res.data.id});

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem accepting that invitation.");
					});
				}
			}
		})
});
