angular.module('app',[])
	.run(function($rootScope,apis,rootData){
		$rootScope.cond={};
		$rootScope._collections=apis.getData().then(function(){
			$rootScope.cond.col=rootData.colUnd;
		});
		$rootScope.selectCollection=function(data){
			rootData.selected=[];
			$rootScope.cond.search='';
			$rootScope.cond.col=data;
		};
		apis.getUserInfo();
	})
	.controller('SideController',function($scope,$rootScope,apis,blurFactory,rootData,constants){
		$scope.root=rootData;
		$scope.isActive=function(item){
			return $rootScope.cond.col===item;
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
		// XXX
		$scope.loadWebsite=function(){
			alert('我们没有官网！');
		};
		var collectionHeight=constants.collectionHeight;
		$scope.getPos=function(index){
			var css={
				left: 0,
				top: index*collectionHeight+'px',
			};
			return css;
		};
		$scope.getIndex=function(x,y){
			var i=Math.floor(y/collectionHeight);
			var lower=i*collectionHeight;
			var upper=lower+collectionHeight;
			var threshold=3;
			return y>=lower+threshold&&y<=upper-threshold?i:-1;
		};
		$scope.moved=apis.moveCollection;
	})
	.controller('BookmarksController',function($scope,$rootScope,apis,settings,viewFactory,rootData,blurFactory){
		$scope.usershown=false;
		var user=document.querySelector('.user');
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
		$scope.login=function(){
			apis.logIn();
		};
		$scope.logout=function(){
			apis.logOut();
		};
		$scope.root=rootData;
		$rootScope.cond.search='';
		$scope.setView=function(view){
			$rootScope.cond.view=view;
			settings.set('view',view);
			viewFactory.checkView();
		};
		$scope.setView(settings.get('view','tile'));
		$scope.reset=function(){
			$rootScope.cond.search='';
			document.querySelector('.search>input').focus();
		};
		$scope.deselect=function(){
			angular.forEach(rootData.selected,function(b){
				b.selected=false;
			});
			rootData.selected=[];
		};
		$scope.multiremove=function(){
			if(confirm('您确定要删除所选的'+rootData.selected.length+'个书签吗？')) {
				var ids=rootData.selected.map(function(item){
					return item.id;
				});
				apis.removeBookmarks(ids);
			}
		};
		$scope.bmFilter=function(item){
			var search=$rootScope.cond.search;
			if(search) {
				search=search.toLowerCase();
				return [item.title,item.url].some(function(data){
					return data.toLowerCase().indexOf(search)>=0;
				});
			} else {
				return $rootScope.cond.col.id===item.col;
			}
		};
	})
;
