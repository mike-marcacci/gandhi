angular.module('gandhi')

.config(function($stateProvider) {
	'use strict';

	$stateProvider

	.state('portal.admin.users', {
		url: '/users',
		abstract: true,
		template: '<div ui-view></div>',
		controller: ['$scope', 'User', function($scope, User) {
			$scope.table = {
				query: {
					sort: [{
						path: ['name'],
						direction: 'asc'
					}]
				},
				pages: {},
				columns: [{
					primary: true,
					title: ' ',
					path: ['admin'],
					template: '<td><span class="glyphicon glyphicon-star" ng-show="row.admin"></span></td>'
				}, {
					primary: true,
					title: 'Name',
					path: ['name']
				}, {
					primary: false,
					title: 'Email',
					path: ['email']
				}, {
					primary: false,
					title: 'Created',
					path: ['created'],
					template: '<td>{{row.created * 1000 | date:"yyyy.MM.dd - hh:mm a"}}</td>'
				}, {
					primary: false,
					title: 'Updated',
					path: ['updated'],
					template: '<td>{{row.updated * 1000 | date:"yyyy.MM.dd - hh:mm a"}}</td>'
				}]
			};

			function getList(query) {
				$scope.users = $scope.table.data = User.query(query || $scope.table.query, function(users, h) {
					$scope.table.pages = JSON.parse(h('pages'));
				});
			}

			$scope.$on('User', function() {
				getList();
			});
			$scope.$watch('table.query', getList, true);
		}]
	})

	.state('portal.admin.users.list', {
		url: '',
		templateUrl: 'portal/admin/users/list.html'
	})

	.state('portal.admin.users.create', {
		url: '/create',
		templateUrl: 'portal/admin/users/create.html',
		controller: ['$scope', '$state', '$rootScope', '$window', 'User', function($scope, $state, $rootScope, $window, User) {

			// the model to edit
			$scope.userCreate = new User();

			// save
			$scope.create = function() {
				$scope.userCreate.$create().then(function(user) {

					// redirect
					$state.go('portal.admin.users.show', {
						user: user.id
					});

				});
			};
		}]
	})

	.state('portal.admin.users.show', {
		url: '/show/:user',
		templateUrl: 'portal/admin/users/show.html',
		controller: ['$scope', '$rootScope', '$state', '$stateParams', '$window', 'auth', 'User', 'Project', 'Token', function($scope, $rootScope, $state, $stateParams, $window, auth, User, Project, Token) {
			$scope.edit = false;
			$scope.toggleEdit = function() {
				$scope.edit = !$scope.edit;
			};

			$scope.source = false;
			$scope.toggleSource = function() {
				$scope.source = !$scope.source;
			};

			function getObject() {
				if (!$stateParams.user)
					return;

				// get the user
				User.get({
					id: $stateParams.user
				}).$promise.then(function(user) {
					$scope.user = user;
					$scope.userEdit = new User(user);
					$scope.userSource = JSON.stringify(user, null, '\t');
				});

				// get all user's projects
				$scope.projects = Project.query({
					user: $stateParams.user
				});

				// TODO: get all user's files
				// $scope.files = File.query({user: $stateParams.user});
			}

			getObject();
			$scope.$on('User', getObject);

			// replace the project
			$scope.replace = function() {
				var value;

				// parse the string
				try {
					value = JSON.parse($scope.userSource);
				} catch (e) {
					return $window.alert('There\'s an error in your JSON syntax.');
				}

				new User(value).$save({
					id: value.id
				}).then(function(user) {

					// redirect
					$scope.source = false;

				});
			};

			// update the user
			$scope.update = function() {

				// don't save a blank password
				if ($scope.userEdit.password === '')
					delete $scope.userEdit.password;

				$scope.userEdit.$update({
					id: $scope.user.id
				}).then(function(user) {

					// redirect
					$scope.edit = false;

				});
			};

			// delete the user
			$scope.destroy = function() {
				if (!$window.confirm('Are you sure you want to delete this user?'))
					return;

				$scope.user.$delete({id: $scope.user.id}).then(function(user) {

					// redirect
					$state.go('portal.admin.users.list');

				});
			};


			// become the user
			$scope.become = function() {
				if (!$window.confirm('Are you sure you want to log in as this user?'))
					return;

				auth.login({
					email: $scope.user.email,
					token: $window.localStorage.token
				}).then(function() {
					$state.go('portal.dashboard');
				});
			};


			// send the user a recovery token
			$scope.recover = function() {
				Token.create({
					email: $scope.user.email
				}).then(function() {
					$window.alert('Recovery token successfully sent.');
				}, function() {
					$window.alert('There was an error sending a recovery token.');
				});
			};
		}]
	});

});
