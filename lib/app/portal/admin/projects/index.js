angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('portal.admin.projects', {
			url: "/projects",
			abstract: true,
			template: "<div ui-view></div>",
			controller: function($scope, Restangular){
				$scope.query = {};
				$scope.projects = Restangular.all('projects').getList().$object;
			}
		})

		.state('portal.admin.projects.list', {
			url: "",
			templateUrl: "portal/admin/projects/list.html",
			controller: function($scope, Restangular){

			}
		})

		.state('portal.admin.projects.create', {
			url: "/create",
			templateUrl: "portal/admin/projects/create.html",
			controller: function($scope, Restangular, $state){

				// the model to edit
				$scope.projectCreate = JSON.stringify({title: ""}, null, 2);

				// save
				$scope.create = function(){
					var value;

					// parse the string
					try {
						value = JSON.parse($scope.projectCreate);
					} catch (e){
						return alert("There's an error in your JSON syntax.");
					}

					$scope.projects.post(value).then(function(res){

						// update the local project
						$scope.projects.push(res);

						// redirect
						$state.go('portal.admin.projects.show', {project: res.id});

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem saving your changes.");
					})
				}

			}
		})

		.state('portal.admin.projects.show', {
			url: "/show/:project",
			templateUrl: "portal/admin/projects/show.html",
			controller: function($scope, Restangular, $state, $stateParams, $window){
				$scope.edit = false;
				$scope.toggleEdit = function(){
					$scope.edit = !$scope.edit;
				}

				$scope.$watchCollection('projects', function(newValue, oldValue){
					$scope.projects.some(function(project){
						if(project.id != $stateParams.project)
							return false;

						return $scope.project = project;
					});

					if($scope.project)
						$scope.users = $scope.project.getList('users').$object;
				});


				// the model to edit
				$scope.$watch('project', function(newValue, oldValue){
						if(newValue) $scope.projectEdit = JSON.stringify(Restangular.stripRestangular(newValue), null, 2);
				});

				// update the project
				$scope.update = function(){
					var value;

					// parse the string
					try {
						value = JSON.parse($scope.projectEdit);
					} catch (e){
						return alert("There's an error in your JSON syntax.");
					}

					$scope.project.customPUT(value).then(function(res){

						// update the local project
						angular.extend($scope.project, res)

						// redirect
						$scope.edit = false;


					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem saving your changes.");
					})
				}


				// delete the project
				$scope.destroy = function(){
					if(!$window.confirm("Are you sure you want to delete this project?"))
						return;

					$scope.project.remove().then(function(res){

						// remove project from list
						$scope.projects.some(function(project, i){
							if(project.id != res.id)
								return false;

							return $scope.projects.splice(i,1);
						})

						// redirect
						$state.go('portal.admin.projects.list');

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem performing the delete.");
					})
				}

			}
		})

});
