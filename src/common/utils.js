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
				edit: '@',
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
	.directive('collection',function(paths,$rootScope){
		return {
			templateUrl: paths.common+'templates/collection.html',
			replace: true,
			restrict: 'E',
			scope: {
				data: '=',
				edit: '@',
			},
			link: function(scope, element, attrs) {
				scope.stop=$rootScope.stop;
				scope.editCol=function(){
					$rootScope.modal={type:'editCol',data:scope.data};
				};
				scope.removeCol=function(){
					removeCollection(scope.data.id,function(ret){
						if(ret.err) alert(ret.msg);
						else scope.$apply(function(){
							var i=$rootScope.data.cols.indexOf(scope.data);
							$rootScope.data.cols.splice(i,1);
							delete $rootScope.data.d_cols[scope.data.id];
						});
					});
				};
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
					angular.copy(scope.current,scope.edit);
					scope.collection=$rootScope.data.d_cols[scope.edit.col];
				}
				scope.edit={};
				scope.revert=revert;
				scope._save=function(){
					scope.save({item:scope.edit});
				};
				revert();
				scope.$watch('collection',function(){
					scope.edit.col=scope.collection.id;
				},false);
			},
		};
	})
	.directive('bookmark',function($rootScope,$state,paths){
		function shortUrl(url){
			return url.replace(/^https?:\/\//i,'');
		}
		function open(data){
			if(data.url) window.open(data.url);
		}
		function getIcon(data){
			return data.icon||'/img/icon16.png';
		}
		function stop(e){
			e.preventDefault();
			e.stopPropagation();
		}
		function edit(data){
			$state.go('bookmarks.edit',{bid:data.id});
		}
		return {
			restrict:'E',
			replace:true,
			scope:{
				data:'=',
				detail:'@',
			},
			templateUrl:paths.common+'templates/bookmark.html',
			link:function(scope,element,attrs){
				scope.shortUrl=shortUrl;
				scope.getIcon=getIcon;
				scope.open=open;
				scope.stop=stop;
				scope.edit=edit;
				scope.remove=scope.$parent.remove;
				scope.limitTag=$rootScope.limitTag;
			},
		};
	})
;
