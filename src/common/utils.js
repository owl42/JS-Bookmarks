angular.module('app')
	.config(function($compileProvider){
		$compileProvider.imgSrcSanitizationWhitelist(/^(https?|ftp|chrome-extension):/);
	})
	.factory('apis',function($q,$rootScope){
		return {
			stop: function(e){
				e.preventDefault();
				e.stopPropagation();
			},
			getCollections: function(){
				var deferred=$q.defer();
				var data=$rootScope.data;
				data.colAll={};
				data.colUnd={};
				data.cols=[];
				data.d_cols={};
				chrome.runtime.sendMessage({cmd:'GetCollections'},function(cols){
					cols.forEach(function(col){
						if(col.id==-1) // 未分组
							data.colUnd=col;
						else if(col.id==0) // 所有
							data.colAll=col;
						else
							data.cols.push(col);
						data.d_cols[col.id]=col;
					});
					$rootScope.$apply(function(){
						deferred.resolve();
					});
				});
				return deferred.promise;
			},
			saveCollection: function(col){
				var deferred=$q.defer();
				var data=$rootScope.data;
				chrome.runtime.sendMessage({cmd:'SaveCollection',data:col},function(ret){
					var col=data.d_cols[ret.id];
					if(!col)
						data.cols.push(ret);
					else
						angular.extend(col,ret);
					$rootScope.$apply(function(){
						deferred.resolve();
					});
				});
				return deferred.promise;
			},
			removeCollection: function(id){
				var deferred=$q.defer();
				chrome.runtime.sendMessage({cmd:'RemoveCollection',data:id},function(ret){
					$rootScope.$apply(function(){
						deferred.resolve(ret||{});
					});
				});
				return deferred.promise;
			},
			getTags: function(){
				var deferred=$q.defer();
				var data=$rootScope.data;
				data.d_tags={};
				chrome.runtime.sendMessage({cmd:'GetTags'},function(tags){
					data.d_tags=tags;
					$rootScope.$apply(function(){
						deferred.resolve();
					});
				});
				return deferred.promise;
			},
			getBookmarks: function(col){
				var deferred=$q.defer();
				var data=$rootScope.data;
				data.bookmarks=[];
				data.d_bookmarks={};
				if(col!=undefined) chrome.runtime.sendMessage({cmd:'GetBookmarks',data:col},function(bms){
					data.bookmarks=bms;
					bms.forEach(function(b){
						data.d_bookmarks[b.id]=b;
					});
					$rootScope.$apply(function(){
						deferred.resolve();
					});
				}); else deferred.resolve();
				return deferred.promise;
			},
			saveBookmark: function(olditem,item){
				var deferred=$q.defer();
				var data=$rootScope.data;
				chrome.runtime.sendMessage({cmd:'SaveBookmark',data:item},function(id){
					if(olditem.id) {
						if(olditem.col!=item.col) {
							data.d_cols[olditem.col].count--;
							data.d_cols[item.col].count++;
						}
					} else {
						item.id=id;
						data.colAll.count++;
						data.d_cols[item.col].count++;
					}
					$rootScope.$apply(function(){
						deferred.resolve(item);
					});
				});
				return deferred.promise;
			},
			removeBookmark: function(item){
				var deferred=$q.defer();
				var data=$rootScope.data;
				chrome.runtime.sendMessage({cmd:'RemoveBookmark',data:item.id},function(){
					var i=data.bookmarks.indexOf(item);
					data.bookmarks.splice(i,1);
					delete data.d_bookmarks[item.id];
					data.colAll.count--;
					data.d_cols[item.col].count--;
					$rootScope.$apply(function(){
						deferred.resolve();
					});
				});
				return deferred.promise;
			},
			logIn: function(user,pwd){
				var deferred=$q.defer();
				chrome.runtime.sendMessage({cmd:'LogIn',data:{user:user,pwd:pwd}},function(data){
					$rootScope.user=data;
					$rootScope.$apply(function(){
						deferred.resolve();
					});
				});
				return deferred.promise;
			},
			logOut: function(){
				var deferred=$q.defer();
				chrome.runtime.sendMessage({cmd:'LogOut'},function(data){
					$rootScope.user=data;
					$rootScope.$apply(function(){
						deferred.resolve();
					});
				});
				return deferred.promise;
			},
			getUserInfo: function(){
				var deferred=$q.defer();
				chrome.runtime.sendMessage({cmd:'GetUserInfo'},function(data){
					$rootScope.user=data;
					$rootScope.$apply(function(){
						deferred.resolve();
					});
				});
				return deferred.promise;
			},
		};
	})
	.directive('tags',function(paths){
		return {
			templateUrl: paths.common+'templates/tags.html',
			replace: true,
			restrict: 'E',
			scope: {
				data: '=',
			},
			link: function(scope, element, attrs) {
				var placeholder=null;
				scope.tag='';
				scope.focused=false;
				scope.getPlaceholder=function(){
					return placeholder
						||(scope.data&&scope.data.length?'':attrs.placeholder)
						||'';
				};
				scope.add=function(next){
					var v=scope.tag,i=scope.data.indexOf(v);
					if(v&&i<0) scope.data.push(v);
					scope.tag='';
					if(next) input.focus();
					else {
						scope.focused=false;
						placeholder=null;
					}
				};
				scope.remove=function(i){
					scope.data.splice(i,1);
				};
				var input=element[0].querySelector('.input input');
				element.on('click',function(e){
					scope.$apply(function(){
						scope.focused=true;
						placeholder="新标签";
						input.focus();
					});
				});
			},
		};
	})
	.directive('collections',function(paths,$rootScope){
		return {
			templateUrl: paths.common+'templates/collections.html',
			replace: true,
			restrict: 'E',
			scope: {
				cid: '=',
				colAll: '@',
				edit: '@',
				list: '@',
			},
			controller: function($scope){
				$scope.data=$rootScope.data;
				$scope.key=$scope.list?'select':'current';
				$scope.select=function(){
					$scope.key='select';
				};
				this.select=function(item){
					$scope.cid=item.id;
					if(!$scope.list) $scope.key='current';
				};
				this.isActive=function(item){
					return item&&$scope.cid==item.id;
				};
			},
		};
	})
	.directive('collection',function(paths,$rootScope,apis){
		return {
			require: '^collections',
			templateUrl: paths.common+'templates/collection.html',
			replace: true,
			restrict: 'E',
			scope: {
				data: '=',
				edit: '@',
			},
			link: function(scope, element, attrs, colsCtrl) {
				scope.stop=apis.stop;
				scope.isActive=function(){
					return colsCtrl.isActive(scope.data);
				};
				scope.editCol=function(){
					$rootScope.modal={type:'editCol',data:scope.data};
				};
				if(attrs.select) element.on('click',function(){
					scope.$apply(function(){
						colsCtrl.select(scope.data);
					});
				});
				scope.removeCol=function(){
					if(confirm('确定删除分组【'+scope.data.title+'】吗？'))
					apis.removeCollection(scope.data.id).then(function(ret){
						if(ret.err) alert(ret.msg);
						else {
							var i=$rootScope.data.cols.indexOf(scope.data);
							$rootScope.data.cols.splice(i,1);
							delete $rootScope.data.d_cols[scope.data.id];
						}
					});
				};
			},
		};
	})
	.directive('bookmarkinfo',function(paths,$rootScope){
		return {
			restrict:'E',
			replace:true,
			scope:{
				revert:'&',
				save:'&',
				data:'=',
			},
			templateUrl:paths.common+'templates/bookmarkinfo.html',
		};
	})
	.directive('bookmark',function($rootScope,$state,paths,apis){
		function shortUrl(url){
			return url.replace(/^https?:\/\//i,'');
		}
		function open(data){
			if(data.url) window.open(data.url);
		}
		function getIcon(data){
			return data.icon||'/img/icon48.png';
		}
		function edit(data){
			$state.go('bookmarks.edit',{bid:data.id});
		}
		return {
			restrict:'E',
			replace:true,
			scope:{
				data:'=',
				detail:'@',
			},
			templateUrl:paths.common+'templates/bookmark.html',
			link:function(scope,element,attrs){
				scope.shortUrl=shortUrl;
				scope.getIcon=getIcon;
				scope.open=open;
				scope.stop=apis.stop;
				scope.edit=edit;
				scope.remove=scope.$parent.remove;
				scope.limitTag=$rootScope.limitTag;
			},
		};
	})
;
