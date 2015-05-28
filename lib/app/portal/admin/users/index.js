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
					admin: true,
					sort: [{
						path: ['name'],
						direction: 'asc'
					}]
				},
				pages: {},
				columns: [{
					width: 30,
					primary: true,
					sortable: true,
					title: ' ',
					path: ['admin'],
					template: '<span class="glyphicon glyphicon-star" ng-show="row.admin"></span>'
				}, {
					primary: true,
					sortable: true,
					title: 'Name',
					flex: 3,
					path: ['name']
				}, {
					primary: false,
					sortable: true,
					title: 'Email',
					flex: 3,
					path: ['email']
				}, {
					primary: false,
					sortable: true,
					title: 'Created',
					flex: 2,
					path: ['created'],
					template: '{{row.created * 1000 | date:"yyyy.MM.dd - hh:mm a"}}'
				}, {
					primary: false,
					sortable: true,
					title: 'Updated',
					flex: 2,
					path: ['updated'],
					template: '{{row.updated * 1000 | date:"yyyy.MM.dd - hh:mm a"}}'
				}]
			};

			function getList(query) {
				User.query(query || $scope.table.query, function(users, h) {
					$scope.users = $scope.table.data = users;
					$scope.table.pages = JSON.parse(h('pages'));
				});
			}

			$scope.$on('User', function() { getList(); });
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
				$scope.userCreate.$create({admin: true}).then(function(user) {

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

			function getUser() {
				if (!$stateParams.user)
					return;

				// get the user
				User.get({
					admin: true,
					id: $stateParams.user
				}).$promise.then(function(user) {
					$scope.user = user;
					$scope.userEdit = new User(user);
					$scope.userSource = JSON.stringify(user, null, '\t');
				});

				// get all cycles
				Cycle.query({
					admin: true
				}).$promise.then(function(cycles){
					$scope.cycles = cycles;
					$scope.cyclesById = _.indexBy(cycles, 'id');
				});

				// get user's projects
				Project.query({
					admin: true,
					user: $stateParams.user,
					sort: [{path: ['created'], direction: 'desc'}]
				}).$promise.then(function(projects){
					$scope.projects = projects;
					$scope.projectsById = _.indexBy(projects, 'id');
				});

				// get user's notifications
				getNotifications();

				// TODO: get all user's files
				// $scope.files = File.query({user: $stateParams.user});
			}

			getUser();
			$scope.$on('User', getUser);




			function getNotifications() {
				if (!$stateParams.user)
					return;

				Notification.query({
					admin: true,
					user: $stateParams.user
				}).$promise.then(function(notifications){
					$scope.notifications = notifications;
					$scope.notificationsById = _.indexBy(notifications, 'id');
				});
			}

			$scope.$on('Notification', getUser);

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
					admin: true,
					id: value.id
				}).then(function() {

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
					admin: true,
					id: $scope.user.id
				}).then(function() {

					// redirect
					$scope.edit = false;

				});
			};

			// delete the user
			$scope.destroy = function() {
				if (!$window.confirm('Are you sure you want to delete this user?'))
					return;

				$scope.user.$delete({
					admin: true,
					id: $scope.user.id
				}).then(function() {

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
				new Token({ email: $scope.user.email }).$create().then(function() {
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
				notification.$update({
					admin: true,
					id: notification.id
				}).then(function(){
					delete $scope.backupNotifications[notification.id];
				});
			};

			$scope.deleteNotification = function(notification) {
				if(!notification) return $window.alert('No notification specified.');
				if(!$window.confirm('Are you sure you want to delete this notification?')) return;
				notification.$delete({
					admin: true,
					id: notification.id
				}).then(function(){
					delete $scope.backupNotifications[notification.id];
				});
			};

			$scope.createNotification = function() {
				$scope.notificationCreate.$create({
					admin: true
				}).then(function(){
					// clear the form
					$scope.notificationCreate = null;
				});
			};


		}]
	});

});
