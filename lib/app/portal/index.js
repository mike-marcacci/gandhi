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

				// Get Resources
				// -------------

				function getCycles(){
					Cycle.query({

						// restrict to those that are active and open
						filter: [{
							op: 'eq',
							path: '/status',
							value: 'active'
						},{
							op: 'eq',
							path: '/open',
							value: true
						}],

						// order by title
						sort: [{path: ['title'], direction: 'asc'}]
					}).$promise.then(function(cycles){
						$scope.cycles = cycles;
					});
				}
				getCycles();
				$scope.$on('Cycle', getCycles);



				function getProjects(){
					Project.query({

						// restrict to assigned projects
						user: $scope.currentUser.id,

						// restrict to those that are still editable
						filter: [{
							op: 'eq',
							path: '/authorizations/update',
							value: true
						}],

						// order by most recently updated
						sort: [{path: ['updated'], direction: 'desc'}]
					}).$promise.then(function(projects){
						$scope.projects = projects;
					});
				}
				getProjects();
				$scope.$on('Project', getProjects);
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
