angular.module('app',['ui.router'])
	.config(function($compileProvider,$stateProvider,$urlRouterProvider){
		$compileProvider.imgSrcSanitizationWhitelist(/^(https?|ftp|chrome-extension):/);
		$urlRouterProvider.otherwise('/login');
		$stateProvider
			.state('login',{
				url:'/login',
				views:{
					left:{
						templateUrl:'templates/user.html',
						controller:LogIn,
					},
					main:{
						template:'',
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
				url:'/:bid',
				templateUrl:'templates/edit.html',
				controller: EditBookmark,
			})
		;
	})
	.run(function($rootScope,$state){
		$rootScope.collections={};
		$rootScope.user={id:0};
		$rootScope.engines={items:[],def:0};
		chrome.runtime.sendMessage({cmd:'GetSearchEngines'},function(data){
			$rootScope.$apply(function(){
				$rootScope.engines=data;
			});
		});
		// TODO: 以后改成点击后再查询
		var colAll={title:'所有书签',count:0,children:[]};
		$rootScope.data={map:{},cols:[colAll],tags:[]};
		chrome.runtime.sendMessage({cmd:'GetBookmarks'},function(data){
			$rootScope.$apply(function(){
				var cat={},htags={};
				colAll.children=data;
				colAll.count=data.length;
				data.forEach(function(b){
					$rootScope.data.map[b.id]=b;
					var c=b.collection||'Default';
					var ca=cat[c];
					if(!ca) {
						cat[c]=ca={title:c,count:0,children:[]};
						$rootScope.data.cols.push(ca);
					}
					ca.children.push(b);
					ca.count++;
					b.tags.forEach(function(t){
						if(!t) return;
						var ta=htags[t];
						if(!ta) {
							htags[t]=ta={title:t,count:0};
							$rootScope.data.tags.push(ta);
						}
						ta.count++;
					});
				});
			});
		});
		$rootScope.$state=$state;
		$rootScope.conditions={
			col:colAll,
			tags:[],
		};
		$rootScope.limitTag=function(tag){
			var i=$rootScope.conditions.tags.indexOf(tag);
			if(i<0) $rootScope.conditions.tags.push(tag);
		};
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
};
var SidePanel=function($scope,$rootScope,$state){
	if(!$rootScope.user.id) $state.go('login');
	$scope.menuitems=[{
		key:'user',
		icon:'user',
	},{
		key:'groups',
		icon:'list',
	},{
		key:'settings',
		icon:'cog',
	}];
	$scope.key='user';
	$scope.show=function(key){
		$scope.key=key;
	};
	$scope.cols=$rootScope.data.cols;
	$scope.tags=$rootScope.data.tags;
};
var Bookmarks=function($scope,$rootScope,$state){
	$scope.edit=function(data){
		$state.go('bookmarks.edit',{bid:data.id});
	};
	$scope.conditions=$rootScope.conditions;
	$scope.remove=function(i){
		$scope.conditions.tags.splice(i,1);
	};
	$scope.checkCondition=function(item){
		return $scope.conditions.tags.every(function(tag){
			return item.tags.indexOf(tag)>=0;
		});
	};
};
var EditBookmark=function($scope,$rootScope,$stateParams,$state){
	var data=$rootScope.data.map[$stateParams.bid];
	$scope.current=data?JSON.parse(JSON.stringify(data)):null;
	$scope.close=function(){
		$state.go('bookmarks');
	};
};
