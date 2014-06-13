angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('admin.cycles', {
			url: "/cycles",
			templateUrl: "admin/cycles/index.html",
			controller: function($scope, Restangular){
				$scope.cycles = Restangular.all('cycles').getList().$object;
			}
		})

		.state('admin.cycles.cycle', {
			url: "/:cycle",
			abstract: true,
			controller: function($scope, Restangular, $stateParams, $window){
				$scope.cycleProjects = null;
				$scope.cycleUsers = null
				$scope.users = null;

				Restangular.all('users').getList().then(function(users){
					$scope.users = users;
				});;

				$scope.$watchCollection('cycles', function(newValue, oldValue){
					$scope.cycles.some(function(cycle){
						if(cycle.id != $stateParams.cycle)
							return false;

						return $scope.cycle = cycle;
					});

					if(!$scope.cycle)
						return;

					// get related projects
					$scope.cycleProjects = $scope.cycle.getList('projects').$object;

					// get related users
					$scope.cycle.getList('users').then(function(users){
						$scope.cycleUsers = users.map(function(user){
							return {
								user: user,
								role: $scope.cycle.users[user.id].role
							}
						});
					})
				});

				$scope.$watchCollection('[cycle, users]', function(newValues, oldValues){
					if(!newValues[0] || !newValues[1])
						return;

					// add user names along w/ roles
					$window._.each(newValues[0].users, function(user, id){
						var entry = $window._.find(newValues[1], {id: id});

						// remove if the user no longer exists
						if(!entry)
							return newValues[0].users[id] = null;

						// make sure the indexed ID is correct
						user.id = id;

						// add the user's name
						user.name = entry.name;
					});
				});
			},
			template: '<div ui-view></div>'
		})

		.state('admin.cycles.cycle.show', {
			url: "/show",
			controller: function($scope, Restangular, $stateParams){

			},
			templateUrl: "admin/cycles/cycle.show.html",
		})

		.state('admin.cycles.cycle.edit', {
			url: "/edit",
			templateUrl: "admin/cycles/cycle.edit.html",
			controller: function($scope, Restangular, $stateParams, $state, $window){
				$scope.cycleEdit = null;

				// the model to edit
				$scope.$watch('cycle', function(newValue, oldValue){
						$scope.cycleEdit = angular.copy(newValue);
				});

				$scope.removeUser = function(id){
					$scope.cycleEdit.users[id] = null;
				};

				$scope.addUser = function(){
					if(!$scope.addUserData)
						return;

					$scope.cycleEdit.users[$scope.addUserData.id] = {};
					$scope.cycleEdit.users[$scope.addUserData.id].id = $scope.addUserData.id;
					$scope.cycleEdit.users[$scope.addUserData.id].name = $scope.addUserData.name;
				};

				$scope.save = function(){

					$scope.cycle.patch($scope.cycleEdit).then(function(res){

						// update the local cycle
						angular.extend($scope.cycle, res)

						// redirect
						$state.go('admin.cycles.cycle.show');

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