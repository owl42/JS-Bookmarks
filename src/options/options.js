angular.module('app',[])
	.run(function($rootScope,apis){
		$rootScope.engines={items:[],def:0};
		chrome.runtime.sendMessage({cmd:'GetSearchEngines'},function(data){
			$rootScope.$apply(function(){
				$rootScope.engines=data;
			});
		});
		$rootScope.data={};
		$rootScope.cond={
			col:apis.UNDEF,
		};
		$rootScope._collections=apis.getCollections().then(function(){
			$rootScope.cond.col=apis.UNDEF;
		});
		$rootScope._bookmarks=apis.getBookmarks();
		$rootScope.$watch('cond.col',function(){
			$rootScope._bookmarks=apis.getBookmarks($rootScope.cond.col);
		},false);
		apis.getUserInfo();
	})
	.controller('SideController',function($scope,$rootScope,apis){
		$scope.config={key:'groups'};
		$scope.root=$rootScope.data;
		$scope.isActive=function(item){
			return $rootScope.cond.col===item.id;
		};
		$rootScope.logout=function(){
			apis.logOut();
		};
		$scope.newCol={
			text:'',
			placeholder:'添加频道',
			focus:true,
		};
		$scope.startAddCol=function(e){
			apis.stop(e);
			$scope.newCol.mode='edit';
		};
		$scope.addCol=function(){
			if($scope.newCol.text) {
				apis.saveCollection({
					id:0,
					title:$scope.newCol.text,
				}).then(function(){
					$scope.newCol.text='';
				});
			}
		};
		$scope.cancelAddCol=function(){
			$scope.newCol.mode='';
			$scope.newCol.text='';
		};
	})
	.controller('BookmarksController',function($scope,$rootScope,apis){
		$scope.deselect=function(){
			angular.forEach($rootScope.data.bookmarks,function(b){
				b.selected=false;
			});
			$rootScope.data.selected=0;
		};
		$scope.multiremove=function(){
			if(confirm('您确定要删除所选的'+$rootScope.data.selected+'个书签吗？')) {
				var ids=[];
				$rootScope.data.bookmarks.forEach(function(item){
					if(item.selected) ids.push(item.id);
				});
				apis.removeBookmarks(ids);
			}
		};
		$scope.bmFilter=function(item){
			return true;
		};
	})
;
