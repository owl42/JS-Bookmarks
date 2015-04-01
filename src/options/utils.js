angular.module('app')
	.value('paths',{
		common:'../common/',
	})
	.directive('searchbox',function($rootScope){
		return {
			restrict: 'E',
			replace: true,
			scope: {
				data: '=',
			},
			templateUrl: 'templates/searchbox.html',
			link: function(scope, element, attrs) {
				scope.current=null;
				scope.text='';
				scope.getCurrent=function(){
					if(!scope.current)
						scope.current=scope.data.items[scope.data.def];
					return scope.current;
				};
				scope.select=function(item){
					scope.current=item;
				};
				scope.selecting=false;
				window.addEventListener('click',function(e){
					scope.$apply(function(){
						scope.selecting=false;
					});
				},false);
				scope.submit=function(){
					if(scope.text) {
						window.open(scope.current.url.replace('%q',scope.text));
						scope.text='';
					}
				};
			},
		};
	})
	.directive('bookmark',function($rootScope,$state){
		function shortUrl(url){
			return url.replace(/^https?:\/\//i,'');
		}
		function getIcon(data){
			return data.icon||'/img/icon16.png';
		}
		function open(data){
			if(data.url) window.open(data.url);
		}
		function edit(data){
			$state.go('bookmarks.edit',{bid:data.id});
		}
		return {
			restrict:'E',
			replace:true,
			scope:{
				data:'=',
			},
			templateUrl:'templates/bookmark.html',
			link:function(scope,element,attrs){
				scope.shortUrl=shortUrl;
				scope.getIcon=getIcon;
				scope.open=open;
				scope.stop=$rootScope.stop;
				scope.edit=edit;
				scope.remove=scope.$parent.remove;
				scope.limitTag=$rootScope.limitTag;
			},
		};
	})
;
