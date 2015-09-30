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
						// filter: [{
						// 	op: 'eq',
						// 	path: ['authorizations','project/contents:write'],
						// 	value: true
						// }],

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
			controller: ['$scope', '$window', '$location', 'Cycle', 'CycleAssignment', 'ProjectAssignment', function($scope, $window, $location, Cycle, CycleAssignment, ProjectAssignment){







				// TODO: implement invitations here??? We should probably make a directive instead.
				var modelMap = {
					cycle: CycleAssignment,
					project: ProjectAssignment
				};

				$scope.invitationCode = $location.search().invitation || '';
				$scope.acceptInvitation = function(){
					var parts = $scope.invitationCode.split('/');

					// ensure basic vaildity
					if(parts.length !== 3 || !modelMap[parts[0]])
						return $window.alert('Invalid invitation.');

					// choose cycle or project assignment
					var params = {
						invitation: parts[2],
						id: $scope.currentUser.id
					}; params[parts[0]] = parts[1];

					// create the new assignment
					return new modelMap[parts[0]]({
						id: $scope.currentUser.id
					}).$save(params).then(function(assignment) {
						$scope.invitationCode = '';
						$window.alert('Invitation accepted.');
					})
				}








				$scope.activeProjectsByCycle = null;
				$scope.$watchCollection('projects', function(projects){
					if(!projects || !projects.length) return ($scope.activeProjectsByCycle = null);
					$scope.activeProjectsByCycle = _.groupBy(projects, 'cycle_id');
				});



				// Get Resources
				// -------------

				function getCycles(){
					Cycle.query().$promise.then(function(cycles){
						$scope.cycles = cycles;
						$scope.cyclesById = _.indexBy(cycles, 'id');
					});
				}
				getCycles();
				$scope.$on('Cycle', getCycles);

			}]
		});
}])

.directive('gandhiNotifications', function() {
	'use strict';

	return {
		restrict: 'EA',
		templateUrl: 'portal/notifications.html',
		controller: ['$scope', 'Notification', function($scope, Notification) {
			$scope.tab = 'inbox';
			$scope.reading = null; // which notification are we reading?

			function getNotifications(){
				$scope.notifications = Notification.query({user: $scope.currentUser.id});
			}
			getNotifications();

			// filter: is the notification in the inbox?
			$scope.inbox = function(n) {
				return n.status_id === 'unread' || n.status_id === 'read';
			}

			// read a notification and mark as read
			$scope.read = function(n) {

				// toggle reading
				$scope.reading = $scope.reading == n.id ? null : n.id;

				// mark as read
				if(n.status_id === 'unread') {
					n.status_id = 'read';
					new Notification({status_id: 'read'}).$update({id: n.id});
				}
			}

			// archive a notification
			$scope.archive = function(n) {
				n.status_id = 'archived';
				new Notification({status_id: 'archived'}).$update({id: n.id});
			}
		}]
	};
})

.directive('gandhiList', ['$window', function($window){
	return {
		templateUrl: 'portal/list.html',
		restrict: 'EA',
		transclude: true,
		scope: true,
		link: function link(scope, element, attrs, controller, transclude) {

			// add special injected scope variables
			scope.scope = scope.$parent.$eval(attrs.scope);

			// add scope variables
			scope.table = scope.$parent.$eval(attrs.gandhiList);
			scope.limit = scope.$parent.$eval(attrs.limit);
			scope.srefBase  = scope.$parent.$eval(attrs.srefBase);
			scope.srefParam = scope.$parent.$eval(attrs.srefParam);

			// transclude element
			transclude(function(clone) {
				element.children().first().prepend(clone);
			});


			var windowHandler = _.throttle(function() {
				var table = element.find('table').first();
				var tableTop = table.offset().top;
				var tableBottom = tableTop + table.height() - table.children('thead').first().height() - 40;
				scope.width = table.width();
				scope.scrolling = $window.pageYOffset > tableTop && $window.pageYOffset < tableBottom;
				scope.$apply();
			}, 100);


			// watch for window changes
			angular.element($window).bind('scroll', windowHandler);
			angular.element($window).bind('resize', windowHandler);
		},
		controller: ['$scope', '$state', function($scope, $state){
			$scope.$state = $state;
			$scope.eq = angular.equals;

			// build ui-sref params for links
			$scope.params = function(id){
				return '{\'' + $scope.srefParam + '\': \'' + id + '\'}';
			}

			// sort table by column
			$scope.sort = function(column) {
				if(column.sortable) $scope.table.query.sort = [{
					path: column.path,
					direction: $scope.table.query.sort[0] && angular.equals($scope.table.query.sort[0].path, column.path) && $scope.table.query.sort[0].direction === 'asc' ? 'desc' : 'asc'
				}];
			}
		}]
	}
}]);
