angular.module('gandhi-decorator-currency', [])

.config(['schemaFormDecoratorsProvider', function(decoratorsProvider){
	decoratorsProvider.addMapping('bootstrapDecorator', 'currency', 'modules/gandhi-decorator-currency/index.html');
}]);