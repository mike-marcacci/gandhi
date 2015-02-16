angular.module('gandhi')

.provider('ObjectPath', function(){
	'use strict';

	this.parse = window.ObjectPath.parse;
	this.stringify = window.ObjectPath.stringify;
	this.normalize = window.ObjectPath.normalize;
	this.$get = function(){
		return window.ObjectPath;
	};
})

.config(['$stateProvider', function($stateProvider) {
	'use strict';
	
	$stateProvider
		.state('portal.admin', {
			url: '/admin',
			template: '<div ui-view></div>',
			abstract: true,
			resolve: {},
			controller: ['$scope', '$state', function($scope, $state){

				// TODO: we should get/save these to session or local storage!
				// admin display settings
				$scope.displaySettings = {
					showList: false
				};

				// non-admin users don't belong here
				if(!$scope.currentUser || !$scope.currentUser.admin)
					$state.go('portal.dashboard');

			}]
		})
		.state('portal.admin.dashboard', {
			url: '',
			templateUrl: 'portal/admin/dashboard.html'
		});
}])

.directive('gandhiAdminList', function(){
	'use strict';
	
	return {
		templateUrl: 'portal/admin/list.html',
		restrict: 'EA',
		scope: {
			table: '=gandhiAdminList',
			scope: '=scope',
			base: '=base',
			limit: '=limit',
			model: '=model'
		},
		controller: ['$scope', '$state', function($scope, $state){
			$scope.$state = $state;
			$scope.link = function(action, id){
				return $scope.base + '.' + action + '({\'' + $scope.model + '\': \'' + id + '\'})';
			};
			$scope.path = function(action){
				return $scope.base + '.' + action;
			};
			$scope.params = function(id){
				return '{\'' + $scope.model + '\': \'' + id + '\'}';
			};
		}]
	};
})

.directive('gandhiPermissions', function(){
	'use strict';
	
	return {
		templateUrl: 'portal/admin/permissions.html',
		restrict: 'E',
		require: 'ngModel',
		scope: {
			model: '=ngModel',
			permissions: '=permissions',
			roles: '=roles',
			triggers: '=triggers',
			edit: '=edit'
		}
	};
})

.directive('gandhiPermission', function(){
	'use strict';
	
	return {
		templateUrl: 'portal/admin/permission.html',
		restrict: 'E',
		require: 'ngModel',
		scope: {
			model: '=ngModel',
			triggers: '=triggers',
			role: '=role',
			edit: '=edit'
		},
		link: function(scope, element, attrs, ngModel) {
			scope.addTrigger = function(obj, prop, val) {
				obj[prop] = _.union(obj[prop], [val]);
			};

			scope.removeTrigger = function(obj, prop, val) {
				obj[prop] = _.without(obj[prop], val);
				if(obj[prop].length === 0) obj[prop] = false;
			};
		},
		controller: ['$scope', function($scope){
			$scope.$watch('model', function(model){
				$scope.tab = model === true || !model ? 'simple' : 'advanced';
			});
		}]
	};
});
