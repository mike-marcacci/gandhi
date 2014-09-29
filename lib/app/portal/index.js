angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {
	$stateProvider
		.state('portal', {
			url: "",
			templateUrl: "portal/index.html",
			abstract: true,
			resolve: {},
			controller: function($scope, Restangular){
				$scope.cycles = null;

				// current user
				$scope.$watch('currentUser', function( newValue, oldValue ) {

					if(!newValue || !newValue.id)
						return;

					Restangular.all('cycles').getList({open: true}).then(function(res){
						$scope.cycles = res.data;	
					});

					// TODO: replace this with a list of "starred" projects from currentUser.starred
					$scope.currentUser.getList('projects').then(function(res){
						$scope.projects = res.data;
					});

				});

				$scope.$on('projects', function(){
					$scope.projects.getList().then(function(res){
						$scope.projects = res.data;
					})
				});
			}
		})
		.state('portal.dashboard', {
			url: "/",
			templateUrl: "portal/dashboard.html",
			controller: function($scope){

			}
		})
		.state('recovery', {
			url: "/recovery",
			templateUrl: "recovery.html",
			resolve: {},
			controller: function($scope, Restangular, $state){
				$scope.recovery = {
					password: '',
					password2: ''
				};

				$scope.submit = function(){
					if(!$scope.recovery.password || $scope.recovery.password == '')
						return alert('You must submit a new password.');

					if($scope.recovery.password !== $scope.recovery.password2)
						return alert('Your passwords do not match.');

					$scope.currentUser.patch({password: $scope.recovery.password}).then(function(res){

						// update the local user
						angular.extend($scope.currentUser, Restangular.stripRestangular(res));

						// redirect to the dashboard
						$state.go('portal.dashboard');
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
