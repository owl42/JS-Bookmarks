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
					main:{
						template:'<h1 align=center>这里可以放幅画</h1>',
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
					main:{
						templateUrl:'templates/bookmarks.html',
						controller: Bookmarks,
					},
				},
			})
			.state('bookmarks.edit',{
				url:'/edit/:bid',
				templateUrl:'templates/edit.html',
				controller: EditBookmark,
			})
		;
	})
	.controller('editColController',function($scope,$rootScope,apis){
		var data=$rootScope.modal.data||{};
		$scope.col={
			id:data.id||0,
			title:data.title||'新分组',
			icon:data.icon,
		};
		$scope.save=function(){
			apis.saveCollection($scope.col).then(function(){
				$rootScope.modal=null;
			});
		};
		$scope.close=function(){
			$rootScope.modal=null;
		};
	})
	.run(function($rootScope,$state,apis){
		$rootScope.engines={items:[],def:0};
		chrome.runtime.sendMessage({cmd:'GetSearchEngines'},function(data){
			$rootScope.$apply(function(){
				$rootScope.engines=data;
			});
		});
		$rootScope.data={};
		$rootScope.conditions={
			col:0,
			tags:[],
		};
		$rootScope._collections=apis.getCollections().then(function(){
			$rootScope.conditions.col=$rootScope.data.colAll.id;
		});
		$rootScope._tags=apis.getTags();
		$rootScope._bookmarks=apis.getBookmarks();
		$rootScope.$state=$state;
		$rootScope.limitTag=function(tag){
			var i=$rootScope.conditions.tags.indexOf(tag);
			if(i<0) $rootScope.conditions.tags.push(tag);
		};
		$rootScope.$watch('conditions.col',function(){
			$rootScope._bookmarks=apis.getBookmarks($rootScope.conditions.col);
		},false);
	})
	.run(function($rootScope,$state){
		// test
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
		else apis.logIn($scope.email,$scope.pwd,function(){
			if($rootScope.user.id) $state.go('bookmarks');
			// TODO: failed log in
		});
	};
};
var SidePanel=function($scope,$rootScope,$state,apis){
	apis.getUserInfo().then(function(){
		if(!$rootScope.user.id) $state.go('login');
	});
	$scope.menuitems=[{
		key:'groups',
		icon:'list',
	},{
		key:'settings',
		icon:'cog',
	}];
	$scope.key='groups';
	$scope.show=function(key){
		$scope.key=key;
	};
	$scope.data=$rootScope.data;
	$scope.limitCol=function(c){
		$rootScope.conditions.col=c.id;
	};
	$scope.editCol=function(){
		$rootScope.modal={type:'editCol'};
	};
	$scope.logout=function(){
		apis.logOut(function(){
			$state.go('login');
		});
	};
};
var Bookmarks=function($scope,$rootScope,$state,apis){
	$scope.remove=function(data){
		apis.removeBookmark(data).then(function(){
			if(data===$scope.current.item) $state.go('bookmarks');
		});
	};
	$scope.conditions=$rootScope.conditions;
	$scope.removeTag=function(i){
		$scope.conditions.tags.splice(i,1);
	};
	$scope.checkCondition=function(item){
		return $scope.conditions.tags.every(function(tag){
			return item.tags.indexOf(tag)>=0;
		});
	};
	// 为了突出显示正在编辑的项目
	$scope.current={
		bid:null,
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
				col:$rootScope.conditions.col||-1,
				tags:[],
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
		apis.saveBookmark($scope.current.item,$scope.current.edit).then(function(data){
			var old=$scope.current.item,
					root=$rootScope.data,
					ccol=$rootScope.conditions.col;
			if(old.id) {
				if(old.col!=data.col&&old.col==ccol) {
					var i=root.bookmarks.indexOf(old);
					root.bookmarks.splice(i,1);
					delete root.d_bookmarks[old.id];
				} else
					angular.extend(old,data);
			} else {
				if(data.col==ccol||ccol===root.colAll.id) {
					root.d_bookmarks[data.id]=data;
					root.bookmarks.push(data);
				}
				$state.go('bookmarks.edit',{bid:data.id});
			}
		});
	};
};
