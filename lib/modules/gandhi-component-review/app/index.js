'use strict';

angular.module('gandhi-component-review', ['gandhi-component', 'schemaForm'])

.config(function(GandhiComponentProvider) {
	GandhiComponentProvider.register({
		id: 'review',
		title: 'Review',
		permissions: {
			'read:public': {
				id: 'read:public',
				title: 'Read Public Comments'
			},
			'read:private': {
				id: 'read:private',
				title: 'Read Private Comments'
			},
			'read:authors': {
				id: 'read:authors',
				title: 'See Comment Authors'
			},
			write: {
				id: 'write',
				title: 'Write Comments'
			}
		},
		directives: {
			default: 'gandhi-component-review',
			contentAdmin: 'gandhi-component-review',
			stageAdmin: 'gandhi-component-review-stage-admin'
		}
	});
})

.directive('gandhiComponentReview', function() {
	return {
		scope: false,
		templateUrl: 'assets/bower/gandhi-component-review/app/default.html',
		controller: ['$scope', '$rootScope', '$element', '$attrs', '$window', 'Stage', 'Content', 'User', function($scope, $rootScope, $element, $attrs, $window, Stage, Content, User) {

			$scope.data = {};
			$scope.preview = {};
			$scope.tab = 'write';

			$scope.$watch('context', function(context) {
				if(!context) return;

				// give the view access to the context
				angular.extend($scope, context);
			});


			// get the previewed content
			$scope.$watch('preview.id', _.debounce(function(id, old){
				if(!id) return;
				$scope.preview.stage = Stage.get({
					admin: $scope.mode === 'contentAdmin',
					cycle: $scope.cycle.id,
					id: id
				});
				$scope.preview.content = Content.get({
					admin: $scope.mode === 'contentAdmin',
					project: $scope.project.id,
					id: id
				});
			}, 200));


			$scope.$watch('stage', function(stage){
				if(!stage) return;

				// set up preview
				try { $scope.preview.id = $scope.preview.id || stage.component.options.preview[0]; } catch(e){}
			});


			$scope.$watch('content', function(content){
				if(!content) return;

				// set up content for write
				$scope.data = content.data[$rootScope.currentUser.id] ? content.data[$rootScope.currentUser.id].form : $scope.data;

				// set schema-review options
				$scope.sfOptions = { formDefaults: {
					supressPropertyTitles: true,
					readonly: !(content && content.authorizations && content.authorizations['write'] && (!content.data[$rootScope.currentUser.id] || !content.data[$rootScope.currentUser.id].locked))
				}};

				// invert content for read tab
				$scope.comments = {};
				$scope.userIds = [];
				_.each(content.data, function(review, userId){
					$scope.userIds.push(userId);
					_.each(review, function(v, k){
						$scope.comments[k] = $scope.comments[k] || {};
						$scope.comments[k][userId] = v;
					});
				});
			});


			$scope.$watch('userIds', function(userIds){
				if(!userIds || !userIds.length || !$scope.content || !$scope.content.authorizations || !$scope.content.authorizations['read:authors']) return;

				User.query({filter: [{op: 'in', path: '/id', value: userIds}]}).$promise.then(function(users){
					$scope.users = users;
					$scope.usersById = _.indexBy(users, 'id');
				});
			});


			// save a draft
			$scope.save = function(){

				var delta = {data:{}};
				delta.data[$rootScope.currentUser.id] = {
					form: $scope.data,
					locked: false
				};

				new Content(delta).$update({
					admin: $scope.mode === 'contentAdmin',
					project: $scope.project.id,
					id: $scope.content.id,
					status: 'draft'
				}).then(function(content){
					$window.alert('Changes successfully saved.');
				})
			};


			// submit
			$scope.submit = function(){

				// make the user confirm
				if(!$window.confirm('Are you sure you want to submit this review?')) return;

				var delta = {data:{}};
				delta.data[$rootScope.currentUser.id] = {
					form: $scope.data,
					locked: true
				};

				new Content(delta).$update({
					admin: $scope.mode === 'contentAdmin',
					project: $scope.project.id,
					id: $scope.content.id,
					status: 'draft'
				}).then(function(content){
					$window.alert('Changes successfully saved.');
				})
			};

		}]
	};
})

.directive('gandhiComponentReviewStageAdmin', function() {
	return {
		scope: false,
		templateUrl: 'assets/bower/gandhi-component-review/app/stageAdmin.html',
		controller: ['$scope', '$element', '$attrs', 'Stage', function($scope, $element, $attrs, Stage) {
			$scope.$watch('context', function(context) {
				if(!context) return;

				// give the view access to the context
				angular.extend($scope, context);

				// copy of the stage for schema-review
				$scope.copy = angular.copy(context.stage)

				// set schema-review options
				$scope.sfOptions = { formDefaults: {
					supressPropertyTitles: true,
				}};

				// get stages
				Stage.query({
					admin: true,
					cycle: context.cycle.id
				}).$promise.then(function(stages){
					$scope.stages = stages;
					$scope.stagesById = _.indexBy(stages, 'id');
				});

			});


			// Validate form data against the schema
			$scope.validate = function(){
				$scope.$broadcast('schemaFormValidate')
			}

			// Options
			$scope.stageOptionsEdit = null;
			$scope.toggleStageOptionsEdit = function(){
				$scope.stageOptionsEdit = $scope.stageOptionsEdit ? null : new Stage({component:{options:{preview: $scope.stage.component.options.preview || []}}});
			};
			$scope.updateStageOptions = function(){
				$scope.stageOptionsEdit.$update({
					admin: true,
					cycle: $scope.cycle.id,
					id: $scope.stage.id
				}).then(function(){
					$scope.stageOptionsEdit = null;
				});
			}

			// Schema
			$scope.stageSchemaEdit = null;
			$scope.toggleStageSchemaEdit = function(){
				$scope.stageSchemaEdit = $scope.stageSchemaEdit ? null : new Stage({component:{options:{schema: $scope.stage.component.options.schema || {type:'object',properties:{}} }}});
			};
			$scope.updateStageSchema = function(){
				$scope.stageSchemaEdit.$update({
					admin: true,
					cycle: $scope.cycle.id,
					id: $scope.stage.id
				}).then(function(){
					$scope.stageSchemaEdit = null;
				});
			}

			// Form
			$scope.stageFormEdit = null;
			$scope.toggleStageFormEdit = function(){
				$scope.stageFormEdit = $scope.stageFormEdit ? null : new Stage({component:{options:{form: $scope.stage.component.options.form || ['*']}}});
			};
			$scope.updateStageForm = function(){
				$scope.stageFormEdit.$update({
					admin: true,
					cycle: $scope.cycle.id,
					id: $scope.stage.id
				}).then(function(){
					$scope.stageFormEdit = null;
				});
			}
			
		}]
	};
});

