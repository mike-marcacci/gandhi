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
					template: '<span class="glyphicon glyphicon-star" ng-show="row.admin"></span>'
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
					template: '{{row.created * 1000 | date:"yyyy.MM.dd - hh:mm a"}}'
				}, {
					primary: false,
					title: 'Updated',
					path: ['updated'],
					template: '{{row.updated * 1000 | date:"yyyy.MM.dd - hh:mm a"}}'
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
		controller: ['$scope', '$state', 'User', function($scope, $state, User) {

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
		controller: ['$scope', '$state', '$stateParams', '$window', 'auth', 'User', 'Cycle', 'Project', 'Notification', 'Token', function($scope, $state, $stateParams, $window, auth, User, Cycle, Project, Notification, Token) {
			$scope.edit = false;
			$scope.toggleEdit = function() {
				$scope.edit = !$scope.edit;
			};

			$scope.source = false;
			$scope.toggleSource = function() {
				$scope.source = !$scope.source;
			};


			// Get Resources
			// -------------

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

				// get all cycles
				Cycle.query().$promise.then(function(cycles){
					$scope.cycles = cycles;
					$scope.cyclesById = _.indexBy(cycles, 'id');
				});

				// get user's notifications
				$scope.notifications = Notification.query({
					user: $stateParams.user
				});

				// get user's projects
				$scope.projects = Project.query({
					user: $stateParams.user,
					sort: [{path: ['created'], direction: 'desc'}]
				});

				// TODO: get all user's files
				// $scope.files = File.query({user: $stateParams.user});
			}

			getObject();
			$scope.$on('Notification', getObject);

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




			// Notifications
			// -------------

			$scope.notificationCreate = null;
			$scope.toggleNotificationCreate = function() {
				$scope.notificationCreate = $scope.notificationCreate ? null : new Notification({user_id: $scope.user.id, status_id: 'unread'});
			};

			$scope.backupNotifications = {};
			$scope.toggleNotificationEdit = function(notification) {
				if(!$scope.backupNotifications[notification.id])
					return ($scope.backupNotifications[notification.id] = angular.copy(notification));

				// revert to backup
				angular.extend(notification, $scope.backupNotifications[notification.id]);
				delete $scope.backupNotifications[notification.id];
			};

			$scope.updateNotification = function(notification) {
				if(!notification) return $window.alert('No notification specified.');
				notification.$update({id: notification.id}).then(function(){
					delete $scope.backupNotifications[notification.id];
				});
			};

			$scope.deleteNotification = function(notification) {
				if(!notification) return $window.alert('No notification specified.');
				if(!$window.confirm('Are you sure you want to delete this notification?')) return;
				notification.$delete({id: notification.id}).then(function(){
					delete $scope.backupNotifications[notification.id];
				});
			};

			$scope.createNotification = function() {
				$scope.notificationCreate.$create().then(function(){
					// clear the form
					$scope.notificationCreate = null;
				});
			};


		}]
	});

});
