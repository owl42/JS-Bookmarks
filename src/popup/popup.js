angular.module('app',['ui.router'])
	.config(function($stateProvider,$urlRouterProvider){
		$urlRouterProvider.otherwise('/');
		$stateProvider
			.state('home',{
				url:'/',
				templateUrl: 'templates/home.html',
				controller: Home,
			})
			.state('bookmarks',{
				url:'/bookmarks/:cid',
				controller: Bookmarks,
				templateUrl: 'templates/bookmarks.html',
			})
			.state('edit',{
				url:'/edit/:id',
				controller: Bookmark,
				templateUrl: 'templates/edit.html',
			})
		;
	})
	.run(function($rootScope,$state,apis){
		var config=$rootScope.config={count:0};
		chrome.tabs.query({active:true},function(tab){
			config.tab=tab[0];
			$rootScope.$apply(function(){
				config.urlValid=/^https?:\/\//.test(tab[0].url);
			});
		});
		$rootScope.$state=$state;
		$rootScope.data={};
		$rootScope._collections=apis.getCollections();
	})
;

var Home=function($scope,$state){
	$scope.showSettings=function(){
		chrome.tabs.create({url:chrome.extension.getURL('/options/options.html')});
	};
	$scope.current={col:null};
	$scope.$watch('current.col',function(){
		if($scope.current.col!=null) $state.go('bookmarks',{cid:$scope.current.col});
	});
};
var Bookmarks=function($scope,$rootScope,$stateParams,$state,apis){
	var col=$rootScope.data.d_cols[$stateParams.cid];
	if(!col) $state.go('home');
	$scope.data=$rootScope.data;
	apis.getBookmarks(col.id);
	$scope.back=function(){
		$state.go('home');
	};
};
var Bookmark=function($scope,$rootScope,$state){
	$scope.bookmark={
		url:$rootScope.config.tab.url,
		title:$rootScope.config.tab.title,
		desc:'',
		col:-1,
		tags:[],
	};
	$scope.save=function(item){
		apis.saveBookmark($scope.bookmark,item).then(function(){
			$scope.back();
		});
	};
	$scope.back=function(){
		$state.go('home');
	};
};
