	angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('portal.admin.files', {
			url: "/files",
			abstract: true,
			template: "<div ui-view></div>",
			controller: function($scope, Restangular){
				$scope.query = {};
				$scope.files = Restangular.all('files').getList().$object;

				$scope.$on('files', function(){
					$scope.files = $scope.files.getList().$object;
				});
			}
		})

		.state('portal.admin.files.list', {
			url: "",
			templateUrl: "portal/admin/files/list.html",
			controller: function($scope, Restangular){

			}
		})

		// .state('portal.admin.files.create', {
		// 	url: "/create",
		// 	templateUrl: "portal/admin/files/create.html",
		// 	controller: function($scope, $rootScope, Restangular, $state){

		// 		// the model to edit
		// 		$scope.fileSource = JSON.stringify({title: ""}, null, 2);

		// 		// save
		// 		$scope.create = function(){
		// 			var value;

		// 			// parse the string
		// 			try {
		// 				value = JSON.parse($scope.fileSource);
		// 			} catch (e){
		// 				return alert("There's an error in your JSON syntax.");
		// 			}

		// 			$scope.files.post(value).then(function(res){

		// 				// update the local lists
		// 				$rootScope.$broadcast('files');

		// 				// redirect
		// 				$state.go('portal.admin.files.show', {file: res.id});

		// 			}, function(err){
		// 				if(err.data && err.data.message)
		// 					alert(err.data.message);
		// 				else
		// 					alert("There was a problem saving your changes.");
		// 			})
		// 		}

		// 	}
		// })

		.state('portal.admin.files.show', {
			url: "/show/:file",
			templateUrl: "portal/admin/files/show.html",
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


				$scope.$watchCollection('files', function(newValue, oldValue){
					$scope.files.some(function(file){
						if(file.id != $stateParams.file)
							return false;

						return $scope.file = file;
					});
				});


				// the model to edit
				$scope.$watch('file', function(newValue, oldValue){
						if(!newValue) return;
						$scope.fileEdit = Object.create(newValue);
						$scope.fileSource = JSON.stringify(Restangular.stripRestangular(newValue), null, 2);
				}, true);

				// replace the file
				$scope.replace = function(){
					var value;

					// parse the string
					try {
						value = JSON.parse($scope.fileSource);
					} catch (e){
						return alert("There's an error in your JSON syntax.");
					}

					$scope.file.customPUT(value).then(function(res){

						// update the local lists
						$rootScope.$broadcast('files');

						// redirect
						$scope.source = false;

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem saving your changes.");
					})
				}

				// update the file
				$scope.update = function(){
					var value;

					// parse the string
					try {
						value = JSON.parse($scope.fileSource);
					} catch (e){
						return alert("There's an error in your JSON syntax.");
					}

					$scope.file.customPUT(value).then(function(res){

						// update the local lists
						$rootScope.$broadcast('files');

						// redirect
						$scope.source = false;

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem saving your changes.");
					})
				}


				// delete the file
				$scope.destroy = function(){
					if(!$window.confirm("Are you sure you want to delete this file?"))
						return;

					$scope.file.remove().then(function(res){

						// update the local lists
						$rootScope.$broadcast('files');

						// redirect
						$state.go('portal.admin.files.list');

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
