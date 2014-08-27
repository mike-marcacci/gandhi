angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('portal.admin.projects', {
			url: '/projects',
			abstract: true,
			template: '<div ui-view></div>',
			controller: function($scope, Restangular){
				$scope.projects = null;
				$scope.table = {
					query: {
						sort: '[\'title\']'
					},
					pages: {},
					data: $scope.projects,
					columns: [
						{primary: true, title: 'Title', key: 'title'},
						{primary: true, title: 'Status', key: 'status'},
						{primary: false, title: 'Created', key: 'created'},
						{primary: false, title: 'Updated', key: 'updated'}
					]
				};

				function getList(query){
					Restangular.withConfig(function(RestangularConfigurer) {
						RestangularConfigurer.setFullResponse(true);
					}).all('projects').getList(query || $scope.query).then(function(res){
						$scope.table.data = $scope.projects = res.data;
						$scope.table.pages = JSON.parse(res.headers('Pages'));
					});
				}

				$scope.$on('projects', function(){ getList(); });
				$scope.$watch('table.query', getList, true);
			}
		})

		.state('portal.admin.projects.list', {
			url: '',
			templateUrl: 'portal/admin/projects/list.html',
			controller: function($scope, Restangular){

			}
		})

		.state('portal.admin.projects.create', {
			url: '/create',
			templateUrl: 'portal/admin/projects/create.html',
			controller: function($scope, $rootScope, Restangular, $state){

				// the model to edit
				$scope.projectCreate = JSON.stringify({title: ''}, null, 2);

				// save
				$scope.create = function(){
					var value;

					// parse the string
					try {
						value = JSON.parse($scope.projectCreate);
					} catch (e){
						return alert('There\'s an error in your JSON syntax.');
					}

					$scope.projects.post(value).then(function(res){

						// update the local lists
						$rootScope.$broadcast('projects');

						// redirect
						$state.go('portal.admin.projects.show', {project: res.id});

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert('There was a problem saving your changes.');
					})
				}

			}
		})

		.state('portal.admin.projects.show', {
			url: '/show/:project',
			templateUrl: 'portal/admin/projects/show.html',
			controller: function($scope, $rootScope, Restangular, $state, $stateParams, $window){
				$scope.source = false;
				$scope.toggleSource = function(){
					$scope.source = !$scope.source;
				}

				$scope.project = null;
				$scope.users = null;

				function getObject(){
					Restangular.all('projects').get($stateParams.project).then(function(project){
						$scope.project = project;
						$scope.users = project.getList('users').$object;
					});
				}

				getObject();
				$scope.$on('projects', getObject);

				// the model to edit
				$scope.$watch('project', function(newValue, oldValue){
						if(newValue) $scope.projectSource = JSON.stringify(Restangular.stripRestangular(newValue), null, 2);
				});

				// update the project
				$scope.replace = function(){
					var value;

					// parse the string
					try {
						value = JSON.parse($scope.projectSource);
					} catch (e){
						return alert('There\'s an error in your JSON syntax.');
					}

					$scope.project.customPUT(value).then(function(res){

						// update the local lists
						$rootScope.$broadcast('projects');

						// redirect
						$scope.source = false;


					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert('There was a problem saving your changes.');
					})
				}


				// delete the project
				$scope.destroy = function(){
					if(!$window.confirm('Are you sure you want to delete this project?'))
						return;

					$scope.project.remove().then(function(res){

						// update the local lists
						$rootScope.$broadcast('projects');

						// redirect
						$state.go('portal.admin.projects.list');

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert('There was a problem performing the delete.');
					})
				}

			}
		})

});
