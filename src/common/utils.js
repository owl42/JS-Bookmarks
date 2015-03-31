angular.module('app')
	.config(function($compileProvider){
		$compileProvider.imgSrcSanitizationWhitelist(/^(https?|ftp|chrome-extension):/);
	})
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
				current: '=',
				colAll: '@',
			},
			link: function(scope, element, attrs) {
				scope.data=$rootScope.data;
				scope.key=attrs.list?'select':'current';
				scope.select=function(item){
					if(item) {
						scope.current=item;
						if(!attrs.list) scope.key='current';
					} else scope.key='select';
				};
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
	.directive('bookmarkinfo',function(paths,$rootScope){
		return {
			restrict:'E',
			replace:true,
			scope:{
				current:'=',
				save:'&',
			},
			templateUrl:paths.common+'templates/bookmarkinfo.html',
			link:function(scope,element,attrs){
				function revert(){
					scope.edit=JSON.parse(JSON.stringify(scope.current));
					scope.collection=$rootScope.data.d_cols[scope.edit.collection];
				}
				scope.revert=revert;
				scope._save=function(){
					for(var i in scope.edit) {
						var d=scope.edit[i];
						if(Array.isArray(d)) d=d.slice();
						scope.current[i]=d;
					}
					scope.save();
				};
				revert();
				scope.$watch('collection',function(){
					scope.edit.collection=scope.collection.id;
				},false);
			},
		};
	})
;
