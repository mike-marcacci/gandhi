angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('admin.projects', {
			url: "/projects?program",
			templateUrl: "admin/projects/index.html",
			controller: function($scope, $stateParams, $state, Restangular){
				$scope.program = null;
				$scope.projects = null;
				$scope.programs = null;

				Restangular.all('programs').getList().then(function(programs){
					$scope.programs = programs;
					if($stateParams.program && $scope.programs)
						$scope.programs.some(function(program){
							if(program.id != $stateParams.program)
								return false;

							return $scope.program = program;
						});
				})

				$scope.$watch('program', function(newValue, oldValue){
					$scope.projects = Restangular.all('projects').getList($scope.program ? {'filter[program_id]': $scope.program.id} : null).$object;
				})

				$scope.filter = function(){
					$state.go('admin.projects', {program: $scope.program ? $scope.program.id : null});
				}
			}
		})

		.state('admin.projects.project', {
			url: "/:project",
			abstract: true,
			controller: function($scope, Restangular, $stateParams){
				$scope.program = null;
				$scope.project = null;
				$scope.stages = [];

				$scope.$watchCollection('projects', function(newValue, oldValue){
					// set the project
					if(!$scope.projects.some(function(project){
						if(project.id != $stateParams.project)
							return false;

						return $scope.project = project;
					})) return;

					// set the project's program
					if(!$scope.programs.some(function(program){
						if(program.id != $scope.project.program_id)
							return false;

						return $scope.program = program;
					})) return;

					$scope.stages = [];
					$scope.program.flow.default.forEach(function(id){
						$scope.stages.push({
							program: $scope.program.flow.stages[id],
							project: $scope.project.flow.stages[id] || null
						});
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
			controller: function($scope, Restangular, $stateParams, $state){
				$scope.projectEdit = null;

				// the model to edit
				$scope.$watch('project', function(newValue, oldValue){
						$scope.projectEdit = angular.copy(newValue);
				});

				$scope.save = function(){

					$scope.project.patch($scope.projectEdit).then(function(res){

						// update the local user
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
						if(stage.program.id != $stateParams.stage)
							return false;

						return $scope.stage = stage;
					})) return;

					$scope.src = 'components/'+$scope.stage.program.component.name+'/admin/index.html'
				})
			}
		})

});