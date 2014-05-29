angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('admin.programs', {
			url: "/programs",
			templateUrl: "admin/programs/index.html",
			controller: function($scope, Restangular){
				$scope.programs = Restangular.all('programs').getList().$object;
			}
		})

		.state('admin.programs.program', {
			url: "/:program",
			abstract: true,
			controller: function($scope, Restangular, $stateParams, $window){
				$scope.programProjects = null;
				$scope.programUsers = null
				$scope.users = null;

				Restangular.all('users').getList().then(function(users){
					$scope.users = users;
				});;

				$scope.$watchCollection('programs', function(newValue, oldValue){
					$scope.programs.some(function(program){
						if(program.id != $stateParams.program)
							return false;

						return $scope.program = program;
					});

					if(!$scope.program)
						return;

					// get related projects
					$scope.programProjects = $scope.program.getList('projects').$object;

					// get related users
					$scope.program.getList('users').then(function(users){
						$scope.programUsers = users.map(function(user){
							return {
								user: user,
								role: $scope.program.users[user.id].role
							}
						});
					})
				});

				$scope.$watchCollection('[program, users]', function(newValues, oldValues){
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

		.state('admin.programs.program.show', {
			url: "/show",
			controller: function($scope, Restangular, $stateParams){

			},
			templateUrl: "admin/programs/program.show.html",
		})

		.state('admin.programs.program.edit', {
			url: "/edit",
			templateUrl: "admin/programs/program.edit.html",
			controller: function($scope, Restangular, $stateParams, $state, $window){
				$scope.programEdit = null;

				// the model to edit
				$scope.$watch('program', function(newValue, oldValue){
						$scope.programEdit = angular.copy(newValue);
				});

				$scope.removeUser = function(id){
					$scope.programEdit.users[id] = null;
				};

				$scope.addUser = function(){
					if(!$scope.addUserData)
						return;

					$scope.programEdit.users[$scope.addUserData.id] = {};
					$scope.programEdit.users[$scope.addUserData.id].id = $scope.addUserData.id;
					$scope.programEdit.users[$scope.addUserData.id].name = $scope.addUserData.name;
				};

				$scope.save = function(){

					$scope.program.patch($scope.programEdit).then(function(res){

						// update the local program
						angular.extend($scope.program, res)

						// redirect
						$state.go('admin.programs.program.show');

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