angular.module('app',['ui.router'])
	.value('paths',{
		common:'../common/',
	})
	.config(function($stateProvider,$urlRouterProvider){
		$urlRouterProvider.otherwise('/');
		$stateProvider
			.state('popup', {
				abstract: true,
				url: '',
				templateUrl: 'templates/home.html',
			})
			.state('popup.index',{
				url:'/',
				controller: Index,
				template: '',
			})
			.state('popup.bookmark',{
				url:'/bookmarks/:id',
				controller: Bookmark,
				templateUrl: 'templates/bookmark.html',
			})
		;
	})
	.run(function($rootScope,$state,$location){
		var config=$rootScope.config={count:0};
		chrome.tabs.query({active:true},function(tab){
			config.tab=tab[0];
			$rootScope.$apply(function(){
				config.urlValid=/^https?:\/\//.test(tab[0].url);
			});
		});
		$rootScope.$state=$state;
		$rootScope.showSettings=function(){
			chrome.tabs.create({url:chrome.extension.getURL('/options/options.html')});
		};
		$rootScope.editBookmark=function(){
			$location.path('/bookmarks/0');
		};
		$rootScope.groups=[{
			id:1,
			title:'default',
			items:[{
				id:1,
				title:'test1',
				number:0,
			},{
				id:2,
				title:'test2',
				number:0,
			}],
			collapse:false,
		}];
		$rootScope.collections={};
		$rootScope.groups.forEach(function(group){
			group.items.forEach(function(coll){
				$rootScope.collections[coll.id]=coll;
			});
		});
	})
;

var Index=function(){
};
var Bookmark=function($scope,$rootScope,$location){
	function delayedBack(url){
		setTimeout(function(){
			$scope.$apply(function(){
				$location.path(url);
			});
		},500);
	}
	$scope.bookmark={
		url:$rootScope.config.tab.url,
		title:$rootScope.config.tab.title,
		desc:'',
		collection:2,
		tags:['abc','def'],
	};
	$scope.groups=$rootScope.groups;
	$scope.back=function(){
		document.querySelector('.homeCol').classList.add('index');
		delayedBack('/');
	};
	$scope.save=function(){
		alert('Not supported yet.');
	};
};
