angular.module('gandhi')

.config(function($stateProvider) {

	$stateProvider
		.state('portal.admin.users', {
			url: "/users",
			abstract: true,
			template: "<div ui-view></div>",
			controller: ['$scope', 'User', function($scope, User){
				$scope.table = {
					query: {
						sort: [{path: ['name'], direction: 'asc'}]
					},
					pages: {},
					columns: [
						{primary: true, title: ' ', path: ['admin'], template: '<td><span class="glyphicon glyphicon-star" ng-show="row.admin"></span></td>'},
						{primary: true, title: 'Name', path: ['name']},
						{primary: false, title: 'Email', path: ['email']},
						{primary: false, title: 'Created', path: ['created']},
						{primary: false, title: 'Updated', path: ['updated']}
					]
				};

				function getList(query){
					$scope.users = $scope.table.data = User.query(query || $scope.table.query, function(users, h){
						$scope.table.pages = JSON.parse(h('pages'));
					});
				}

				$scope.$on('users', function(){ getList(); });
				$scope.$watch('table.query', getList, true);
			}]
		})

		.state('portal.admin.users.list', {
			url: "",
			templateUrl: "portal/admin/users/list.html"
		})

		.state('portal.admin.users.create', {
			url: "/create",
			templateUrl: "portal/admin/users/create.html",
			controller: ['$scope', 'User', '$state', '$rootScope', function($scope, User, $state, $rootScope){

				// the model to edit
				$scope.userCreate = new User();

				// save
				$scope.create = function(){
					$scope.userCreate.$create().then(function(user){

						// update the local lists
						$rootScope.$broadcast('users');

						// redirect
						$state.go('portal.admin.users.show', {user: user.id});

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem saving your changes.");
					})
				}

			}]
		})

		.state('portal.admin.users.show', {
			url: "/show/:user",
			templateUrl: "portal/admin/users/show.html",
			controller: ['$scope', '$rootScope', 'User', 'Project', 'Token', '$state', '$stateParams', '$window', 'auth', function($scope, $rootScope, User, Project, Token, $state, $stateParams, $window, auth){
				$scope.edit = false;
				$scope.toggleEdit = function(){
					$scope.edit = !$scope.edit;
				}

				$scope.source = false;
				$scope.toggleSource = function(){
					$scope.source = !$scope.source;
				}

				function getObject(){
					if(!$stateParams.user)
						return;

					// get the user
					User.get({id: $stateParams.user}).$promise.then(function(user){
						$scope.user = user;
						$scope.userEdit = new User(user);
						$scope.userSource = JSON.stringify(user, null, '\t');
					});

					// get all user's projects
					$scope.projects = Project.query({user: $stateParams.user});

					// TODO: get all user's files
					// $scope.files = File.query({user: $stateParams.user});
				}

				getObject();
				$scope.$on('users', getObject);

				// replace the project
				$scope.replace = function(){
					var value;

					// parse the string
					try {
						value = JSON.parse($scope.userSource);
					} catch (e){
						return alert("There's an error in your JSON syntax.");
					}

					new User(value).$save({id: value.id}).then(function(user){

						// update the local lists
						$rootScope.$broadcast('users', user.id);

						// redirect
						$scope.source = false;

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem saving your changes.");
					})
				}

				// update the user
				$scope.update = function(){

					// don't save a blank password
					if($scope.userEdit.password == '')
						delete $scope.userEdit.password;

					$scope.userEdit.$update({id: $scope.user.id}).then(function(user){

						// broadcast update event
						$rootScope.$broadcast('users', user.id);

						// redirect
						$scope.edit = false;

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem saving your changes.");
					})
				}


				// delete the user
				$scope.destroy = function(){
					if(!$window.confirm("Are you sure you want to delete this user?"))
						return;

					$scope.user.$delete({id: $scope.user.id}).then(function(user){

						// update the local lists
						$rootScope.$broadcast('users', user.id);

						// redirect
						$state.go('portal.admin.users.list');

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem performing the delete.");
					})
				}


				// become the user
				$scope.become = function(){
					if(!$window.confirm("Are you sure you want to log in as this user?"))
						return;

					auth.login({email: $scope.user.email, token: $window.localStorage.token}).then(function(){
						$state.go('portal.dashboard');
					})
				}


				// send the user a recovery token
				$scope.recover = function(){
					Token.create({email: $scope.user.email}).then(function(res){
						alert('Recovery token successfully sent.');
					}, function(err){
						alert('There was an error sending a recovery token.');
					})
				}

			}]
		})

});
