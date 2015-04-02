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
;
