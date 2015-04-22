angular.module('app',['ui.router'])
	.config(function($stateProvider,$urlRouterProvider){
		$urlRouterProvider.otherwise('/login');
		$stateProvider
			.state('login',{
				url:'/login',
				views:{
					left:{
						templateUrl:'templates/login.html',
						controller:LogIn,
					},
					center:{
						templateUrl:'templates/main.html',
					},
				}
			})
			.state('bookmarks',{
				url:'/bookmarks',
				views:{
					left:{
						templateUrl:'templates/leftside.html',
						controller:SidePanel,
					},
					center:{
						templateUrl:'templates/bookmarks.html',
						controller: Bookmarks,
					},
				},
			})
		;
	})
	.run(function($rootScope,$state,apis){
		$rootScope.engines={items:[],def:0};
		chrome.runtime.sendMessage({cmd:'GetSearchEngines'},function(data){
			$rootScope.$apply(function(){
				$rootScope.engines=data;
			});
		});
		$rootScope.data={};
		$rootScope.cond={
			col:apis.UNDEF,
			//tags:[],
		};
		$rootScope._collections=apis.getCollections().then(function(){
			$rootScope.cond.col=apis.UNDEF;
		});
		//$rootScope._tags=apis.getTags();
		$rootScope._bookmarks=apis.getBookmarks();
		$rootScope.$state=$state;
		/*$rootScope.limitTag=function(tag){
			var i=$rootScope.cond.tags.indexOf(tag);
			if(i<0) $rootScope.cond.tags.push(tag);
		};*/
		$rootScope.$watch('cond.col',function(){
			$rootScope._bookmarks=apis.getBookmarks($rootScope.cond.col);
		},false);
		$rootScope.blur=[];
		angular.element(document).on('mousedown', function(e){
			var blur=$rootScope.blur;
			if(blur.length) {
				$rootScope.blur=[];
				angular.forEach(blur, function(item){
					if(item[0].compareDocumentPosition(e.target)&16)
						$rootScope.blur.push(item);
					else
						item[1]();
				});
			}
		});
	})
;

var LogIn=function($scope,$rootScope,$state,apis){
	apis.getUserInfo().then(function(){
		if($rootScope.user.id) $state.go('bookmarks');
	});
	$scope.mode='login';
	$scope.switchMode=function(){
		$scope.mode=$scope.mode=='login'?'signin':'login';
	};
	$scope.name='';
	$scope.email='';
	$scope.pwd='';
	$scope.sign=function(){
		if($scope.mode=='signin') alert('Not supported yet.');
		else apis.logIn($scope.email,$scope.pwd).then(function(){
			if($rootScope.user.id) $state.go('bookmarks');
			// TODO: failed log in
		});
	};
};
var SidePanel=function($scope,$rootScope,$state,apis){
	apis.getUserInfo().then(function(){
		if(!$rootScope.user.id) $state.go('login');
	});
	$scope.config={key:'groups'};
	$scope.root=$rootScope.data;
	$scope.isActive=function(item){
		return $rootScope.cond.col===item.id;
	};
	$rootScope.logout=function(){
		apis.logOut().then(function(){
			$state.go('login');
		});
	};
	$scope.newCol={
		text:'',
		placeholder:'添加频道',
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
};
var Bookmarks=function($scope,$rootScope,$state,apis){
	$scope.bmFilter=function(item){
		return true;
	};
};
var EditBookmark=function($scope,$rootScope,$stateParams,$state,apis){
	$scope.current.bid=$stateParams.bid;
	$rootScope._collections.then(function(){
		if($scope.current.bid>0)
			$scope.current.item=$rootScope.data.d_bookmarks[$scope.current.bid];
		else
			$scope.current.item={
				title:'新书签',
				col:$rootScope.cond.col||apis.UNDEF,
				//tags:[],
			};
		$scope.revert();
	});
	$scope.close=function(){
		$state.go('bookmarks');
	};
	$scope.revert=function(){
		$scope.current.edit={};
		angular.copy($scope.current.item,$scope.current.edit);
		$scope.current.collection=$rootScope.data.d_cols[$scope.current.edit.col];
	};
	$scope.save=function(){
		var url=apis.normalizeURL($scope.current.edit.url);
		if(!url) {
			alert('请填写正确的网址！');
			return;
		}
		$scope.current.edit.url=url;
		apis.saveBookmark($scope.current.item,$scope.current.edit).then(function(data){
			var old=$scope.current.item;
			var root=$rootScope.data;
			var ccol=$rootScope.cond.col;
			//var otags=old.tags;
			if(old.id) {
				if(old.col!=data.col&&old.col==ccol) {
					var i=root.bookmarks.indexOf(old);
					root.bookmarks.splice(i,1);
					delete root.d_bookmarks[old.id];
				} else
					angular.extend(old,data);
			} else {
				//otags=[];
				if(data.col==ccol||ccol===root.colAll.id) {
					root.d_bookmarks[data.id]=data;
					root.bookmarks.push(data);
				}
				$state.go('bookmarks.edit',{bid:data.id});
			}
			/*data.tags.forEach(function(tag){
				var i=otags.indexOf(tag);
				if(i<0) {
					root.d_tags[tag]=(root.d_tags[tag]||0)+1;
				} else
					otags[i]=null;
			});
			otags.forEach(function(tag){
				if(tag) {
					if(!--root.d_tags[tag]) delete root.d_tags[tag];
				}
			});*/
			//$scope.revert();
			$state.go('bookmarks');
		});
	};
};
