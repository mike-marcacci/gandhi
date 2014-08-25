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

.directive('gandhiAdminTable', function($parse, ObjectPath){
	return {
		template: '<thead><tr><th ng-class="{info: table.query.sort === normalize(column.key)}" style="cursor: pointer;" ng-click="sort(column)" ng-repeat="column in table.columns" ng-bind="column.title || column.key"></th></tr></thead>',
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
					element.append(column.template || '<td ng-bind="row' + ObjectPath.normalize(column.key) + '"></td>');
				});
				$compile(element)(scope);
			}
		}
	}
})

.directive('gandhiAdminTablePagination', function($compile, ObjectPath){
	return {
		restrict: 'EA',
		scope: {
			table: '=gandhiAdminTablePagination'
		},
		template: ''
			+'<ul class="pagination pagination-sm" ng-show="table.pages.first != table.pages.last">'
				+'<li ng-click="table.query.page = 1" ng-class="{disabled: !table.query.page || table.query.page === 1}"><a href>&laquo;</a></li>'
				+'<li ng-click="table.query.page = table.pages.prev" ng-show="table.pages.prev"><a href>{{table.pages.prev}} <span class="sr-only">(prev)</span></a></li>'
				+'<li class="active"><a href>{{table.query.page || 1}} <span class="sr-only">(current)</span></a></li>'
				+'<li ng-click="table.query.page = table.pages.next" ng-show="table.pages.next"><a href>{{table.pages.next}} <span class="sr-only">(next)</span></a></li>'
				+'<li ng-click="table.query.page = table.pages.last" ng-class="{disabled: table.query.page &amp;&amp; table.query.page === table.pages.last}"><a href>&raquo;</a></li>'
			+'</ul>'
	}
})