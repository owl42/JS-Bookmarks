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
	.controller('editColController',function($scope,$rootScope){
		var data=$rootScope.modal.data||{};
		$scope.col={
			id:data.id||0,
			title:data.title||'新分组',
			icon:data.icon,
		};
		$scope.save=function(){
			chrome.runtime.sendMessage({cmd:'SaveCollection',data:$scope.col},function(data){
				$scope.$apply(function(){
					var col=$rootScope.data.d_cols[data.id];
					if(!col)
						$rootScope.data.cols.push(data);
					else
						angular.extend(col,data);
					$rootScope.modal=null;
				});
			});
		};
		$scope.close=function(){
			$rootScope.modal=null;
		};
	})
	.run(function($rootScope,$state){
		$rootScope.user={id:0};
		$rootScope.engines={items:[],def:0};
		chrome.runtime.sendMessage({cmd:'GetSearchEngines'},function(data){
			$rootScope.$apply(function(){
				$rootScope.engines=data;
			});
		});
		$rootScope.data={
			d_tags:{},
			bookmarks:[],
			d_bookmarks:{},
		};
		$rootScope.conditions={
			col:null,
			tags:[],
		};
		getCollections($rootScope.data,function(){
			$rootScope.$apply(function(){
				$rootScope.conditions.col=$rootScope.data.colAll;
			});
		});
		chrome.runtime.sendMessage({cmd:'GetTags'},function(data){
			$rootScope.$apply(function(){
				$rootScope.data.d_tags=data;
			});
		});
		$rootScope.$state=$state;
		$rootScope.limitTag=function(tag){
			var i=$rootScope.conditions.tags.indexOf(tag);
			if(i<0) $rootScope.conditions.tags.push(tag);
		};
		$rootScope.$watch('conditions.col',function(){
			$rootScope.data.bookmarks=[];
			$rootScope.data.d_bookmarks={};
			if($rootScope.conditions.col)
				chrome.runtime.sendMessage({cmd:'GetBookmarks',data:$rootScope.conditions.col.id},function(data){
					$rootScope.$apply(function(){
						$rootScope.data.bookmarks=data;
						data.forEach(function(b){
							$rootScope.data.d_bookmarks[b.id]=b;
						});
					});
				});
		},false);
	})
	.run(function($rootScope,$state){
		// test
		$rootScope.logout=function(){
			$rootScope.user={id:0};
			$state.go('login');
		};
	})
;

var LogIn=function($scope,$rootScope,$state){
	if($rootScope.user.id) $state.go('bookmarks');
	$scope.mode='login';
	$scope.switchMode=function(){
		$scope.mode=$scope.mode=='login'?'signin':'login';
	};
	$scope.name='';
	$scope.email='';
	$scope.pwd='';
	$scope.login=function(){
		$rootScope.user={
			id:1,
			name:'Gerald',
			avatar:'http://cn.gravatar.com/avatar/a0ad718d86d21262ccd6ff271ece08a3?s=80',
		};
		$state.go('bookmarks');
	};
	$scope.login();
};
var SidePanel=function($scope,$rootScope,$state){
	if(!$rootScope.user.id) $state.go('login');
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
		$rootScope.conditions.col=c;
	};
	$scope.editCol=function(){
		$rootScope.modal={type:'editCol'};
	};
};
var Bookmarks=function($scope,$rootScope,$state){
	$scope.remove=function(data){
		removeBookmark(data,$rootScope.data,function(){
			$scope.$apply(function(){
				if(data===$scope.current.item) $state.go('bookmarks');
			});
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
var EditBookmark=function($scope,$rootScope,$stateParams,$state){
	$scope.current.bid=$stateParams.bid;
	if($scope.current.bid>0)
		$scope.current.item=$rootScope.data.d_bookmarks[$scope.current.bid];
	else
		$scope.current.item={
			title:'新书签',
			col:$rootScope.conditions.col.id||-1,
			tags:[],
		};
	$scope.close=function(){
		$state.go('bookmarks');
	};
	$scope.save=function(item){
		saveBookmark($scope.current.item,item,$rootScope.data,function(data){
			var item=$scope.current.item,
					root=$rootScope.data,
					ccol=$rootScope.conditions.col;
			$scope.$apply(function(){
				if(data.id) {
					if(item.col!=data.col&&item.col==ccol.id) {
						var i=root.bookmarks.indexOf(item);
						root.bookmarks.splice(i,1);
						delete root.d_bookmarks[item.id];
					} else
						angular.extend(item,data);
				} else if(data.col==ccol.id||ccol===root.colAll) {
					root.d_bookmarks[data.id]=data;
					root.bookmarks.push(data);
				}
			});
		});
	};
};
