angular.module('gandhi-decorator-elastic-textarea', [])

.config(['schemaFormDecoratorsProvider', function(decoratorsProvider){
	decoratorsProvider.addMapping('bootstrapDecorator', 'elastic-textarea', 'modules/gandhi-decorator-elastic-textarea/index.html');
}]);