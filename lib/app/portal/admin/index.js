angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {
	$stateProvider
		.state('portal.admin', {
			url: "/admin",
			template: "<div ui-view></div>",
			abstract: true,
			resolve: {},
			controller: function($scope, $state){
				$scope.$watch('currentUser', function(currentUser){
					// non-admin users don't belong here
					if(currentUser && !currentUser.admin)
						$state.go('portal.dashboard');
				});
			}
		})
		.state('portal.admin.dashboard', {
			url: "",
			templateUrl: "portal/admin/dashboard.html",
			controller: function($scope){

			}
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
		controller: function($scope){
			$scope.link = function(action, id){
				return $scope.base + '.' + action + '({\'' + $scope.model + '\': \'' + id + '\'})';
			}
		}
	}
})

.directive('gandhiAdminTable', function($parse, ObjectPath){
	return {
		template: '<thead><tr><th ng-if="!limit || column.primary" ng-class="{info: table.query.sort === normalize(column.key)}" style="cursor: pointer;" ng-click="sort(column)" ng-repeat="column in table.columns" ng-bind="column.title || column.key"></th></tr></thead>',
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
			$scope.normalize = ObjectPath.normalize;
			$scope.sort = function(column) {
				var key = ObjectPath.normalize(column.key);
				if($scope.table.query.sort === key)
					return $scope.table.query.direction = $scope.table.query.direction === 'desc' ? 'asc' : 'desc';

				$scope.table.query.sort = key;
				$scope.table.query.direction = 'asc';
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
						element.append(column.template || '<td ng-bind="row' + ObjectPath.normalize(column.key) + '"></td>');
				});
				$compile(element)(scope);
			}
		}
	}
})
