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
	.run(function($rootScope,$state){
		var config=$rootScope.config={count:0};
		chrome.tabs.query({active:true},function(tab){
			config.tab=tab[0];
			$rootScope.$apply(function(){
				config.urlValid=/^https?:\/\//.test(tab[0].url);
			});
		});
		$rootScope.$state=$state;
		$rootScope.data={};
		getCollections($rootScope.data,function(){
			$rootScope.$apply();
		});
	})
;

var Home=function($scope,$state){
	$scope.showSettings=function(){
		chrome.tabs.create({url:chrome.extension.getURL('/options/options.html')});
	};
	$scope.current={col:null};
	$scope.$watch('current.col',function(){
		if($scope.current.col) $state.go('bookmarks',{cid:$scope.current.col.id});
	});
};
var Bookmarks=function($scope,$rootScope,$stateParams,$state){
	var col=$rootScope.data.d_cols[$stateParams.cid];
	if(!col) $state.go('home');
	$scope.data=$rootScope.data;
	getBookmarks($rootScope.data,col.id,function(){
		$scope.$apply();
	});
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
		saveBookmark($scope.bookmark,item,$rootScope.data,function(data){
			$scope.$apply(function(){
				$scope.back();
			});
		});
	};
	$scope.back=function(){
		$state.go('home');
	};
};
