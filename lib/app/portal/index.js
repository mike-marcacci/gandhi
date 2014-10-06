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

				var query = {filter: {users: {}}, sort: 'title', per_page: 20};

				// current user
				$scope.$watch('currentUser', function( currentUser, oldValue ) {

					if(!currentUser || !currentUser.id)
						return;

					Restangular.all('cycles').getList({open: true}).then(function(res){
						$scope.cycles = res.data;	
					});

					// only retreive directly assigned projects
					query.filter.users[currentUser.id] = {id: {eq: currentUser.id}};
					console.log(query)
					Restangular.all('projects').getList(query).then(function(res){
						$scope.projects = res.data;
					});
				});

				$scope.$on('projects', function(){
					Restangular.all('projects').getList(query).then(function(res){
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
					var parsed = $scope.invitationCode.split(':');
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
