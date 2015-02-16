angular.module('gandhi-decorator-users', [])

// .config(['schemaFormDecoratorsProvider', function(decoratorsProvider){
// 	decoratorsProvider.addMapping('bootstrapDecorator', 'users', 'modules/gandhi-decorator-users/index.html');
// }])

.directive('gandhiDecoratorUsers', function(){
	return {
		template: ''
			+'<ui-select ng-disabled="disabled" ng-model="model" theme="bootstrap">'
				+'<ui-select-match placeholder="Choose a user...">{{$select.selected.name}}</ui-select-match>'
				+'<ui-select-choices refresh="search($select.search)" refresh-delay="200" repeat="item in users | filter: $select.search">'
					+'<div ng-bind-html="item.name | highlight: $select.search"></div>'
					+'<small ng-bind-html="item.email | highlight: $select.search"></small>'
				+'</ui-select-choices>'
			+'</ui-select>'
		,
		restrict: 'A',
		require: 'ngModel',
		scope: {
			model: '=ngModel',
			ngDisabled: '=ngDisabled'
		},
		controller: ['$scope', '$attrs', 'User', function($scope, $attrs, User){
			$scope.users = [];
			$scope.disabled = $attrs.disabled !== undefined || $scope.ngDisabled;

			$scope.search = function(search){

			}
		}]
	}
});