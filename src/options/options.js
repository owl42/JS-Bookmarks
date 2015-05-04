angular.module('app',[])
	.run(function($rootScope,apis){
		/*$rootScope.engines={items:[],def:0};
		chrome.runtime.sendMessage({cmd:'GetSearchEngines'},function(data){
			$rootScope.$apply(function(){
				$rootScope.engines=data;
			});
		});*/
		$rootScope.data={};
		$rootScope.cond={};
		$rootScope._collections=apis.getData().then(function(){
			$rootScope.cond.col=$rootScope.data.colUnd;
		});
		apis.getUserInfo();
	})
	.controller('SideController',function($scope,$rootScope,apis,blurFactory){
		$scope.root=$rootScope.data;
		$scope.usershown=false;
		var user=document.querySelector('.toc .user');
		var hideUser=function(){
			$scope.usershown=false;
			$scope.showUser=showUser;
		};
		var showUser=function(){
			$scope.showUser=null;
			$scope.usershown=true;
			blurFactory.add(user,hideUser);
		};
		$scope.showUser=showUser;
		$scope.isActive=function(item){
			return $rootScope.cond.col===item;
		};
		$scope.login=function(){
			apis.logIn();
		};
		$scope.logout=function(){
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
		$scope.select=function(data){
			$rootScope.data.selected=[];
			$rootScope.cond.search='';
			$rootScope.cond.col=data;
		};
		var popup=document.querySelector('.popup.more');
		var hideMore=function(){
			$scope.shownMore=false;
		};
		$scope.showMore=function(){
			$scope.shownMore=true;
			blurFactory.add(popup,hideMore);
		};
		$scope.importFromChrome=function(){
			$scope.importing=true;
			apis.importFromChrome().then(function(){
				$scope.importing=false;
			});
		};
	})
	.controller('BookmarksController',function($scope,$rootScope,apis,settings,viewFactory){
		$rootScope.cond.search='';
		$scope.setView=function(view){
			$rootScope.cond.view=view;
			settings.set('view',view);
			viewFactory.checkView();
		};
		$scope.setView(settings.get('view','bar'));
		$scope.reset=function(){
			$rootScope.cond.search='';
			document.querySelector('.search>input').focus();
		};
		$scope.deselect=function(){
			angular.forEach($rootScope.data.selected,function(b){
				b.selected=false;
			});
			$rootScope.data.selected=[];
		};
		$scope.multiremove=function(){
			if(confirm('您确定要删除所选的'+$rootScope.data.selected.length+'个书签吗？')) {
				var ids=$rootScope.data.selected.map(function(item){
					return item.id;
				});
				apis.removeBookmarks(ids);
			}
		};
		$scope.bmFilter=function(item){
			var search=$rootScope.cond.search;
			if(search) {
				return item.title.indexOf(search)>=0||item.url.indexOf(search)>=0;
			} else {
				return $rootScope.cond.col.id===item.col;
			}
		};
	})
;
