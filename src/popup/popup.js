angular.module('popup',['ui.router'])
	.config(function($stateProvider,$urlRouterProvider){
		$urlRouterProvider.otherwise('');
		$stateProvider
			.state('popup', {
				abstract: true,
				url: '',
				templateUrl: 'templates/home.html',
			})
			.state('popup.index',{
				url:'',
				controller: Index,
				template: '',
			})
	})
	.controller('Home',function($scope){
		$scope.count=0;
		$scope.groups=[
			{
				title:'default',
				items:[
					{
						title:'test1',
						number:0,
					},{
						title:'test2',
						number:0,
					}
				],
				collapse:false,
			}
		];
		$scope.showSettings=function(){
			chrome.tabs.create({url:chrome.extension.getURL('/index/index.html')});
		};
	})
;

var Index=function(){};
