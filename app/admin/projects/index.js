angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('admin.projects', {
			url: "/projects?cycle",
			templateUrl: "admin/projects/index.html",
			controller: function($scope, $stateParams, $state, Restangular){
				$scope.cycle = null;
				$scope.projects = null;
				$scope.cycles = null;

				Restangular.all('cycles').getList().then(function(cycles){
					$scope.cycles = cycles;
					if($stateParams.cycle && $scope.cycles)
						$scope.cycles.some(function(cycle){
							if(cycle.id != $stateParams.cycle)
								return false;

							return $scope.cycle = cycle;
						});
				})

				$scope.$watch('cycle', function(newValue, oldValue){
					$scope.projects = Restangular.all('projects').getList($scope.cycle ? {'filter[cycle_id]': $scope.cycle.id} : null).$object;
				})

				$scope.filter = function(){
					$state.go('admin.projects', {cycle: $scope.cycle ? $scope.cycle.id : null});
				}
			}
		})

		.state('admin.projects.project', {
			url: "/:project",
			abstract: true,
			controller: function($scope, Restangular, $stateParams, $window){
				$scope.cycle = null;
				$scope.project = null;
				$scope.stages = null;
				$scope.users = null;

				Restangular.all('users').getList().then(function(users){
					$scope.users = users;
				});

				$scope.$watchCollection('projects', function(newValue, oldValue){
					// set the project
					if(!$scope.projects.some(function(project){
						if(project.id != $stateParams.project)
							return false;

						return $scope.project = project;
					})) return;

					// set the project's cycle
					if(!$scope.cycles.some(function(cycle){
						if(cycle.id != $scope.project.cycle_id)
							return false;

						return $scope.cycle = cycle;
					})) return;

					$scope.stages = [];
					$scope.cycle.flow.default.forEach(function(id){
						$scope.stages.push({
							cycle: $scope.cycle.flow.stages[id],
							project: $scope.project.flow.stages[id] || null
						});
					});
				});

				$scope.$watchCollection('[project, users]', function(newValues, oldValues){
					if(!newValues[0] || !newValues[1])
						return;

					// add user names along w/ roles
					$window._.each(newValues[0].users, function(user, id){
						var entry = $window._.find(newValues[1], {id: id});

						// remove if the user no longer exists
						if(!entry || !user)
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

		.state('admin.projects.project.show', {
			url: "",
			templateUrl: "admin/projects/project.show.html",
			controller: function($scope, Restangular, $stateParams, $state, $window){
				// delete the project
				$scope.delete = function(){
					if(!$window.confirm("Are you sure you want to delete this project?"))
						return;

					$scope.project.remove().then(function(res){

						// remove user from list
						$scope.projects.some(function(user, i){
							if(user.id != res.id)
								return false;

							return $scope.projects.splice(i,1);
						})

						// redirect
						$state.go('admin.projects');

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem performing the delete.");
					})
				}
			}
		})

		.state('admin.projects.project.edit', {
			url: "/edit",
			templateUrl: "admin/projects/project.edit.html",
			controller: function($scope, Restangular, $stateParams, $state, $window){
				$scope.projectEdit = null;

				// the model to edit
				$scope.$watch('project', function(newValue, oldValue){
						$scope.projectEdit = angular.copy(newValue);
				});

				$scope.removeUser = function(id){
					$scope.projectEdit.users[id] = null;
				};

				$scope.addUser = function(){
					if(!$scope.addUserData)
						return;

					$scope.projectEdit.users[$scope.addUserData.id] = {};
					$scope.projectEdit.users[$scope.addUserData.id].id = $scope.addUserData.id;
					$scope.projectEdit.users[$scope.addUserData.id].name = $scope.addUserData.name;
				};

				$scope.save = function(){

					$scope.project.patch($scope.projectEdit).then(function(res){

						// update the local project
						angular.extend($scope.project, res)

						// redirect
						$state.go('admin.projects.project.show');

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem saving your changes.");
					})
				}
			}
		})

		.state('admin.projects.project.stage', {
			url: "/stage/:stage",
			templateUrl: "admin/projects/project.show.stage.html",
			controller: function($scope, Restangular, $stateParams){
				$scope.stage = null;
				$scope.src = 'components/index.html';
				// set the stage
				$scope.$watchCollection('stages', function(newValue, oldValue){
					if(!newValue || !newValue.some(function(stage){
						if(stage.cycle.id != $stateParams.stage)
							return false;

						return $scope.stage = stage;
					})) return;

					$scope.src = 'components/'+$scope.stage.cycle.component.name+'/admin/index.html'
				})
			}
		})

});