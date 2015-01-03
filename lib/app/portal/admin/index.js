angular.module('gandhi')

.config(function($stateProvider) {
	$stateProvider
		.state('portal.admin', {
			url: "/admin",
			template: "<div ui-view></div>",
			abstract: true,
			resolve: {},
			controller: function($scope, $state){

				// non-admin users don't belong here
				if(!$scope.currentUser || !$scope.currentUser.admin)
					$state.go('portal.dashboard');

			}
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
		controller: function($scope, $state){
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
		}
	}
})

.directive('gandhiAdminTable', function($parse, ObjectPath){
	return {
		template: '<thead><tr><th ng-if="!limit || column.primary" ng-class="{active: stringify(table.query.sort[0].path) == stringify(column.path)}" style="cursor: pointer;" ng-click="sort(column)" ng-repeat="column in table.columns" ng-bind="column.title || column.key"></th></tr></thead>',
		restrict: 'A',
		transclude: true,
		scope: '&',
		link: function(scope, element, attrs, ctl, transclude) {
			scope.table = $parse(attrs['gandhiAdminTable'])(scope);
			transclude(scope, function(clone, scope) {
				element.append(clone);
			});
		},
		controller: function($scope){
			$scope.stringify = JSON.stringify.bind(JSON);

			$scope.sort = function(column) {
				$scope.table.query.sort = [{
					path: column.path,
					direction: $scope.table.query.sort[0] && JSON.stringify($scope.table.query.sort[0].path) == JSON.stringify(column.path) && $scope.table.query.sort[0].direction === 'asc' ? 'desc' : 'asc'
				}];
			}
		}
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
						element.append(column.template || '<td ng-bind="row' + ObjectPath.stringify(column.path) + '"></td>');
				});
				$compile(element)(scope);
			}
		}
	}
})
