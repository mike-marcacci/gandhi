angular.module('gandhi')

.provider('ObjectPath', function(){
	this.parse = ObjectPath.parse;
	this.stringify = ObjectPath.stringify;
	this.normalize = ObjectPath.normalize;
	this.$get = function(){
		return ObjectPath;
	};
})

.config(function($stateProvider) {
	$stateProvider
		.state('portal.admin', {
			url: "/admin",
			template: "<div ui-view></div>",
			abstract: true,
			resolve: {},
			controller: ['$scope', '$state', function($scope, $state){

				// non-admin users don't belong here
				if(!$scope.currentUser || !$scope.currentUser.admin)
					$state.go('portal.dashboard');

			}]
		})
		.state('portal.admin.dashboard', {
			url: "",
			templateUrl: "portal/admin/dashboard.html"
		})
})

.directive('gandhiAdminList', function(){
	return {
		templateUrl: 'portal/admin/list.html',
		restrict: 'EA',
		scope: {
			table: '=gandhiAdminList',
			base: '=base',
			limit: '=limit',
			model: '=model'
		},
		controller: ['$scope', '$state', function($scope, $state){
			$scope.$state = $state;
			$scope.link = function(action, id){
				return $scope.base + '.' + action + '({\'' + $scope.model + '\': \'' + id + '\'})';
			}
			$scope.path = function(action){
				return $scope.base + '.' + action;
			}
			$scope.params = function(id){
				return '{\'' + $scope.model + '\': \'' + id + '\'}';
			}
		}]
	}
})

.directive('gandhiAdminTable', function($parse, ObjectPath){
	return {
		template: '<thead><tr><th ng-if="!limit || column.primary" ng-class="{active: eq(table.query.sort[0].path, column.path)}" style="cursor: pointer;" ng-click="sort(column)" ng-repeat="column in table.columns" ng-bind="column.title || column.key"></th></tr></thead>',
		restrict: 'A',
		transclude: true,
		scope: '&',
		link: function(scope, element, attrs, ctl, transclude) {
			scope.table = $parse(attrs['gandhiAdminTable'])(scope);
			transclude(scope, function(clone, scope) {
				element.append(clone);
			});
		},
		controller: ['$scope', '$state', function($scope){
			$scope.eq = angular.equals;

			$scope.sort = function(column) {
				$scope.table.query.sort = [{
					path: column.path,
					direction: $scope.table.query.sort[0] && angular.equals($scope.table.query.sort[0].path, column.path) && $scope.table.query.sort[0].direction === 'asc' ? 'desc' : 'asc'
				}];
			}
		}]
	}
})

.directive('gandhiAdminTableRow', function($compile, ObjectPath){
	return {
		restrict: 'A',
		require: '^gandhiAdminTable',
		scope: '@',
		compile: function(element){
			element.removeAttr('gandhi-admin-table-row');
			element.attr('ng-repeat', 'row in table.data');
			return function(scope, element, attrs, gandhiAdminTableCtl) {
				scope.table.columns.forEach(function(column){
					if(!scope.limit || column.primary)
						element.append(column.template ? '<td>' + column.template + '</td>' : '<td ng-bind="row' + ObjectPath.stringify(column.path) + '"></td>');
				});
				$compile(element)(scope);
			}
		}
	}
})

.directive('gandhiPermissions', function(){
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
	}
})

.directive('gandhiPermission', function(){
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
		}
	}
})
