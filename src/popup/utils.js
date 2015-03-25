angular.module('popup')
	.factory('uiUtils',function($location){
		return {
			delayedBack:function($scope,url){
				setTimeout(function(){
					$scope.$apply(function(){
						$location.path(url);
					});
				},500);
			},
		};
	})
	.directive('tags',function(){
		return {
			templateUrl: 'templates/extra/tags.html',
			replace: true,
			restrict: 'E',
			scope: {
				data: '=',
			},
			link: function(scope, element, attrs) {
				scope.tag='';
				scope.focused=false;
				scope.placeholder="Add a tag";
				scope.add=function(next){
					var v=scope.tag,i=scope.data.indexOf(v);
					if(v&&i<0) scope.data.push(v);
					scope.tag='';
					if(next) input.focus();
					else scope.focused=false;
				};
				scope.remove=function(i){
					scope.data.splice(i,1);
				};
				var input=element[0].querySelector('.input input');
				element.on('click',function(e){
					scope.$apply(function(){
						scope.focused=true;
						input.focus();
					});
				});
			},
		};
	})
	.directive('collections',function($rootScope){
		return {
			templateUrl: 'templates/extra/collections.html',
			replace: true,
			restrict: 'E',
			scope: {
				data: '=',
			},
			link: function(scope, element, attrs) {
				scope.current=$rootScope.collections[scope.data];
			},
		};
	})
	.directive('collection',function(){
		return {
			templateUrl: 'templates/extra/collection.html',
			replace: true,
			restrict: 'E',
			scope: {
				data: '=',
			},
			link: function(scope, element, attrs) {
			},
		};
	})
;
