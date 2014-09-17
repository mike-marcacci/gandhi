	angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('portal.admin.files', {
			url: "/files",
			abstract: true,
			template: "<div ui-view></div>",
			controller: function($scope, Restangular){
				$scope.files = null;
				$scope.table = {
					query: {
						sort: '[\'name\']'
					},
					pages: {},
					data: $scope.files,
					columns: [
						{primary: true, title: 'Name', key: 'name'},
						{primary: true, title: 'MimeType', key: 'mimetype'},
						{primary: false, title: 'Size', key: 'size'},
						{primary: false, title: 'User ID', key: 'user_id'},
						{primary: false, title: 'Created', key: 'created'},
						{primary: false, title: 'Updated', key: 'updated'}
					]
				};

				function getList(query){
					Restangular.all('files').getList(query || $scope.table.query).then(function(res){
						$scope.table.data = $scope.files = res.data;
						$scope.table.pages = JSON.parse(res.headers('Pages'));
					});
				}

				$scope.$on('files', function(){ getList(); });
				$scope.$watch('table.query', function(query){ getList(query); }, true);
			}
		})

		.state('portal.admin.files.list', {
			url: "",
			templateUrl: "portal/admin/files/list.html",
			controller: function($scope, Restangular){

			}
		})

		.state('portal.admin.files.create', {
			url: "/create",
			templateUrl: "portal/admin/files/create.html",
			controller: function($scope, $rootScope, Restangular, $state, $upload){

				// the model to edit
				$scope.fileSource = JSON.stringify({title: ""}, null, '\t');

				// save
				$scope.upload = function($files) {
					$scope.inProgress = true;
					$upload.upload({
						url: 'api/files',
						method: 'POST',
						data: {},
						file: $files,
					}).success(function(data, status, headers, config) {
						$scope.inProgress = false;
						
						// update the local lists
						$rootScope.$broadcast('files');

						// redirect
						$state.go('portal.admin.files.show', {file: data[0].id});
					})
					.error(function(err){
						$scope.inProgress = false;
						alert('There was an issue uploading your file. Please try again.');
					})
				};

			}
		})

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

				function getObject(){
					if(!$stateParams.file)
						return;

					Restangular.all('files').getList({'filter[id]': $stateParams.file}).then(function(res){
						if(!res.data.length)
							throw new Error('Failed to fetch file description.');

						$scope.file = res.data[0];
						$scope.fileEdit = Object.create($scope.file);
						$scope.fileSource = JSON.stringify(Restangular.stripRestangular($scope.file), null, 2);
					});

					Restangular.one('files', $stateParams.file).one('user').get().then(function(res){
						$scope.user = res.data;
					});
				}

				getObject();
				$scope.$on('files', getObject);


				// download the actual file
				$scope.download = function(){
					$window.open('api/files/' + $stateParams.file);
				}

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
