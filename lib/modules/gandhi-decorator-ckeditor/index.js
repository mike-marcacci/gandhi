angular.module('gandhi-decorator-ckeditor', [])

.config(['schemaFormDecoratorsProvider', function(decoratorsProvider){
	decoratorsProvider.addMapping('bootstrapDecorator', 'ckeditor', 'modules/gandhi-decorator-ckeditor/index.html');
}]);