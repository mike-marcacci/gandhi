angular.module('gandhi')

.config(['$stateProvider', function($stateProvider) {
	'use strict';

	$stateProvider
		.state('portal', {
			url: '',
			templateUrl: 'portal/index.html',
			abstract: true,
			resolve: {},
			controller: ['$scope', 'Cycle', 'Project', function($scope, Cycle, Project){
				$scope.cycles = Cycle.query({});
				$scope.projects = Project.query({user: $scope.currentUser.id, sort: [{path: ['updated'], direction: 'desc'}]});

				$scope.$on('Project', function(){
					$scope.projects = Project.query({user: $scope.currentUser.id});
				});
			}]
		})
		.state('portal.dashboard', {
			url: '/',
			templateUrl: 'portal/dashboard.html',
			controller: ['$scope', 'Notification', function($scope, Notification){


				// Notifications
				// -------------
				//
				// TODO: break out into a directive.

				$scope.tab = 'inbox';
				$scope.reading = null; // which notification are we reading?

				function getNotifications(){
					$scope.notifications = Notification.query({user: $scope.currentUser.id});
				}
				getNotifications();

				// filter: is the notification in the inbox?
				$scope.inbox = function(n) {
					return n.status === 'unread' || n.status === 'read';
				}

				// read a notification and mark as read
				$scope.read = function(n) {

					// toggle reading
					$scope.reading = $scope.reading == n.id ? null : n.id;

					// mark as read
					if(n.status === 'unread') {
						n.status = 'read';
						new Notification({status: 'read'}).$update({id: n.id});
					}
				}

				// archive a notification
				$scope.archive = function(n) {
					n.status = 'archived';
					new Notification({status: 'archived'}).$update({id: n.id});
				}

				// TODO: implement invitations here??? We should probably make a directive instead.

			}]
		});
}]);
