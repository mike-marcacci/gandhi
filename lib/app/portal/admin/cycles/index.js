	angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('portal.admin.cycles', {
			url: "/cycles",
			abstract: true,
			template: "<div ui-view></div>",
			controller: function($scope, Restangular){
				$scope.query = {};
				$scope.cycles = Restangular.all('cycles').getList().$object;

				$scope.$on('cycles', function(){
					$scope.cycles = $scope.cycles.getList().$object;
				});
			}
		})

		.state('portal.admin.cycles.list', {
			url: "",
			templateUrl: "portal/admin/cycles/list.html",
			controller: function($scope, Restangular){

			}
		})

		.state('portal.admin.cycles.create', {
			url: "/create",
			templateUrl: "portal/admin/cycles/create.html",
			controller: function($scope, $rootScope, Restangular, $state){

				// the model to edit
				$scope.cycleSource = JSON.stringify({title: ""}, null, 2);

				// save
				$scope.create = function(){
					var value;

					// parse the string
					try {
						value = JSON.parse($scope.cycleSource);
					} catch (e){
						return alert("There's an error in your JSON syntax.");
					}

					$scope.cycles.post(value).then(function(res){

						// update the local lists
						$rootScope.$broadcast('cycles');

						// redirect
						$state.go('portal.admin.cycles.show', {cycle: res.id});

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem saving your changes.");
					})
				}

			}
		})

		.state('portal.admin.cycles.show', {
			url: "/show/:cycle",
			templateUrl: "portal/admin/cycles/show.html",
			controller: function($scope, $rootScope, Restangular, $state, $stateParams, $window){
				$scope.edit = false;
				$scope.toggleEdit = function(){
					$scope.edit = !$scope.edit;
				};

				$scope.source = false;
				$scope.toggleSource = function(){
					$scope.source = !$scope.source;
				};

				// options for the waterfall chart
				$scope.waterfallOptions = {
					"hide": false,
					"node": {
						"width": 160,
						"height": 26,
						"margin": {
							"x": 10,
							"y": 5
						}
					}
				};


				$scope.$watchCollection('cycles', function(newValue, oldValue){
					$scope.cycles.some(function(cycle){
						if(cycle.id != $stateParams.cycle)
							return false;

						return $scope.cycle = cycle;
					});
				});


				// the model to edit
				$scope.$watch('cycle', function(newValue, oldValue){
						if(!newValue) return;
						$scope.cycleEdit = Object.create(newValue);
						$scope.cycleSource = JSON.stringify(Restangular.stripRestangular(newValue), null, 2);
						$scope.projects = newValue.getList('projects').$object;
						$scope.users = newValue.getList('users').$object;
				}, true);

				// replace the cycle
				$scope.replace = function(){
					var value;

					// parse the string
					try {
						value = JSON.parse($scope.cycleSource);
					} catch (e){
						return alert("There's an error in your JSON syntax.");
					}

					$scope.cycle.customPUT(value).then(function(res){

						// update the local lists
						$rootScope.$broadcast('cycles');

						// redirect
						$scope.source = false;

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem saving your changes.");
					})
				}

				// update the cycle
				$scope.update = function(){
					var value;

					// parse the string
					try {
						value = JSON.parse($scope.cycleSource);
					} catch (e){
						return alert("There's an error in your JSON syntax.");
					}

					$scope.cycle.customPUT(value).then(function(res){

						// update the local lists
						$rootScope.$broadcast('cycles');

						// redirect
						$scope.source = false;

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem saving your changes.");
					})
				}


				// delete the cycle
				$scope.destroy = function(){
					if(!$window.confirm("Are you sure you want to delete this cycle?"))
						return;

					$scope.cycle.remove().then(function(res){

						// update the local lists
						$rootScope.$broadcast('cycles');

						// redirect
						$state.go('portal.admin.cycles.list');

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
