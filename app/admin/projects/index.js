angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('admin.projects', {
			url: "/projects?cycle",
			templateUrl: "admin/projects/index.html",
			controller: function($scope, $stateParams, $state, Restangular){
				$scope.cycle = null;
				$scope.projects = [];
				$scope.cycles = null;
				$scope.users = null;
				$scope.text = [
					'I do not think the project should be funded',
					'The project could be funded with significant adjustments to content - Revise and Resubmit',
					'The project could be funded in the current state with budget adjustments',
					'I strongly support funding this project as is'
				];

				Restangular.all('users').getList().then(function(users){
					$scope.users = users;
				});

				$scope.getUser = function(id){
					return _.find($scope.users, {id: id});
				}

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
					Restangular.all('projects').getList($scope.cycle ? {'filter[cycle_id]': $scope.cycle.id} : null).then(function(res){
						$scope.projects = _.sortBy(_.map(res, function(project){
							if(!project.flow.stages.administrative_review.data)
								return project;

							function sum(sum, num) {
							  return sum + num;
							}

							var ratings = _.filter(_.map(project.flow.stages.administrative_review.data, function(r){return r.data.rating;}));
							var recommendations = _.filter(_.map(project.flow.stages.administrative_review.data, function(r){return r.data.recommendation;}), function(r){return r !== undefined && r !== null;});

							console.log(ratings, recommendations)

							project.flow.stages.administrative_review.summary = {
								rating: ratings.length ? ratings.reduce(sum) / ratings.length : null,
								recommendation: recommendations.length ? $scope.text[Math.round(recommendations.reduce(sum) / recommendations.length)] : null,
							};
							return project;
						}),function(project){
							return project.flow.stages.administrative_review.summary ? project.flow.stages.administrative_review.summary.rating : null;
						}).reverse();
					});
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

				$scope.$watchCollection('projects', function(newValue, oldValue){
					// set the project
					if(!$scope.projects.some(function(project){
						if(project.id != $stateParams.project)
							return false;

						return $scope.project = project;
					})) return;

					// set a place for stage params
					$scope.params = {};

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