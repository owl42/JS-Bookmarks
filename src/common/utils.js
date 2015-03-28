angular.module('app')
	.directive('tags',function(paths){
		return {
			templateUrl: paths.common+'templates/tags.html',
			replace: true,
			restrict: 'E',
			scope: {
				data: '=',
			},
			link: function(scope, element, attrs) {
				scope.tag='';
				scope.focused=false;
				scope.placeholder="新标签";
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
	.directive('collections',function(paths,$rootScope){
		return {
			templateUrl: paths.common+'templates/collections.html',
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
	.directive('collection',function(paths){
		return {
			templateUrl: paths.common+'templates/collection.html',
			replace: true,
			restrict: 'E',
			scope: {
				data: '=',
			},
			link: function(scope, element, attrs) {
			},
		};
	})
	.directive('bookmarkinfo',function(paths){
		return {
			restrict:'E',
			replace:true,
			scope:{
				data:'=',
			},
			templateUrl:paths.common+'templates/bookmarkinfo.html',
			link:function(scope,element,attrs){
			},
		};
	})
;
