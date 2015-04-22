angular.module('app')
	.config(function($compileProvider){
		$compileProvider.imgSrcSanitizationWhitelist(/^(https?|ftp|chrome-extension):/);
	})
	.factory('apis',function($q,$rootScope){
		var apis={
			//ALL: 0,
			UNDEF: -1,
			//TRASH: -2,
			stop: function(e){
				e.preventDefault();
				e.stopPropagation();
			},
			normalizeURL: function(url){
				if(url) {
					var parts=url.match(/^(\w+:\/\/)?([^/]+.*)$/);
					if(parts) return (parts[1]||'http://')+parts[2];
				}
			},
			getCollections: function(){
				var deferred=$q.defer();
				var data=$rootScope.data;
				//data.colAll={};
				data.colUnd={};
				//data.colTrash={};
				data.cols=[];
				data.d_cols={};
				chrome.runtime.sendMessage({cmd:'GetCollections'},function(cols){
					cols.forEach(function(col){
						if(col.id==apis.UNDEF)
							data.colUnd=col;
						/*else if(col.id==apis.ALL)
							data.colAll=col;
						else if(col.id==apis.TRASH)
							data.colTrash=col;*/
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
					if(!col) {
						data.cols.push(ret);
						data.d_cols[ret.id]=ret;
					} else
						angular.extend(col,ret);
					$rootScope.$apply(function(){
						deferred.resolve();
					});
				});
				return deferred.promise;
			},
			removeCollection: function(data){
				var deferred=$q.defer();
				chrome.runtime.sendMessage({cmd:'RemoveCollection',data:data},function(ret){
					$rootScope.$apply(function(){
						deferred.resolve(ret);
					});
				});
				return deferred.promise;
			},
			/*getTags: function(){
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
			},*/
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
						//data.colAll.count++;
						data.d_cols[item.col].count++;
					}
					$rootScope.$apply(function(){
						deferred.resolve(item);
					});
				});
				return deferred.promise;
			},
			moveToCollection: function(item, col){
				var deferred=$q.defer();
				var data=$rootScope.data;
				chrome.runtime.sendMessage({cmd:'MoveToCollection',data:{id:item.id,col:col}},function(id){
					if(id===item.id) {
						var i=data.bookmarks.indexOf(item);
						if(i>=0) {
							/*if(item.col===apis.TRASH) data.colAll.count++;
							else if(col===apis.TRASH) data.colAll.count--;*/
							data.d_cols[item.col].count--;
							data.d_cols[item.col=col].count++;
							data.bookmarks.splice(i,1);
							delete data.d_bookmarks[item.id];
						}
					}
					$rootScope.$apply(function(){
						deferred.resolve();
					});
				});
				return deferred.promise;
			},
			removeBookmark: function(item){
				var deferred=$q.defer();
				var data=$rootScope.data;
				chrome.runtime.sendMessage({cmd:'RemoveBookmark',data:item.id},function(id){
					if(id===item.id) {
						var i=data.bookmarks.indexOf(item);
						if(i>=0) {
							//if(item.col!==apis.TRASH) data.colAll.count--;
							data.d_cols[item.col].count--;
							data.bookmarks.splice(i,1);
							delete data.d_bookmarks[item.id];
						}
					}
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
		return apis;
	})
	/*.directive('tags',function(){
		return {
			templateUrl: 'templates/tags.html',
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
	})*/
	/*.directive('collections',function($rootScope){
		return {
			templateUrl: 'templates/collections.html',
			replace: true,
			restrict: 'E',
			scope: {
				cid: '=',
				//colAll: '@',
				list: '@',
				editable: '@',
				edit: '&',
				remove: '&',
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
				if($scope.editable) {
					this.edit=function(data){
						$scope.edit({data:data});
					};
					this.remove=function(data){
						$scope.remove({data:data});
					};
				}
			},
		};
	})*/
	.directive('bookmarkinfo',function($rootScope){
		return {
			restrict:'E',
			replace:true,
			scope:{
				save:'&',
				data:'=',
			},
			templateUrl:'templates/bookmarkinfo.html',
		};
	})
	.directive('bookmark',function($rootScope,$state,apis){
		function shortUrl(url){
			return url.replace(/^http?:\/\//i,'').replace(/^([^/]+)\/$/,'$1');
		}
		function open(data,target){
			var url=data.url&&apis.normalizeURL(data.url);
			if(url) {
				if(target=='_blank') window.open(url);
				else location.href=url;
			}
		}
		function getIcon(data){
			return data.icon||'/images/icon48.png';
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
				remove:'&',
				revert:'&',
			},
			templateUrl:'templates/bookmark.html',
			link:function(scope,element,attrs){
				scope.shortUrl=shortUrl;
				scope.getIcon=getIcon;
				scope.open=function(){
					open(scope.data,attrs.target);
				};
				scope.stop=apis.stop;
				scope.edit=edit;
				scope.limitTag=$rootScope.limitTag;
				scope.conditions=$rootScope.conditions;
			},
		};
	})
	.directive('radioboxes',function(){
		return {
			restrict:'E',
			replace:true,
			scope:{
				data:'=',
			},
			templateUrl:'templates/radioboxes.html',
		};
	})
	.directive('editable', function($rootScope,apis){
		return {
			restrict: 'E',
			replace: true,
			scope: {
				data: '=',
				placeholder: '@',
				button: '@',
				change: '&',
				blur: '&',
			},
			templateUrl: 'templates/editable.html',
			link: function(scope, element, attrs) {
				scope.stop=apis.stop;
				scope.checkSubmit = function () {
					if(scope.data.text) {
						scope.change();
						scope.data.mode='';
					}
				};
				scope.$watch('data.mode',function(){
					if(scope.data.mode=='edit') {
						if(attrs.blur) $rootScope.blur.push([element[0],scope.blur]);
						var input=element[0].querySelector('.edit');
						input.select();input.focus();
					}
				});
			},
		};
	})
	.directive('searchbox',function($rootScope){
		return {
			restrict: 'E',
			replace: true,
			scope: {
				data: '=',
			},
			templateUrl: 'templates/searchbox.html',
			link: function(scope, element, attrs) {
				scope.current=null;
				scope.text='';
				scope.getCurrent=function(){
					if(!scope.current)
						scope.current=scope.data.items[scope.data.def];
					return scope.current;
				};
				scope.select=function(item){
					scope.current=item;
				};
				scope.selecting=false;
				window.addEventListener('click',function(e){
					scope.$apply(function(){
						scope.selecting=false;
					});
				},false);
				scope.submit=function(){
					if(scope.text) {
						window.open(scope.current.url.replace('%q',scope.text));
						scope.text='';
					}
				};
			},
		};
	})
	.directive('collection',function($rootScope,apis){
		return {
			templateUrl: 'templates/collection.html',
			replace: true,
			restrict: 'E',
			scope: {
				data: '=',
				change: '&',
				select: '&',
				change: '&',
			},
			link: function(scope, element, attrs) {
				scope.stop=apis.stop;
				scope.edit=attrs.change;
				scope.cond=$rootScope.cond;
				if(attrs.change) {
					scope.editdata={};
					scope.editCol=function(){
						scope.editdata.mode='edit';
					};
					var close=function(){
						scope.editdata.mode='';
						scope.editdata.text=scope.data.title;
					};
					scope.check=function(){
						if(scope.editdata.text) {
							if(scope.editdata.text!=scope.data.title)
								scope.change({
									data:{
										id:scope.data.id,
										title:scope.editdata.text,
									},
								});
							close();
							return true;
						}
					};
					if(attrs.blur) scope.blur=function(){
						attrs.blur=='change'&&scope.check()||close();
					};
					//scope.removeCol=colsCtrl.remove;
					scope.$watch('data.title',function(){
						scope.editdata.text=scope.data.title;
					});
				}
				if(attrs.select) element.on('click',function(){
					scope.$apply(function(){
						scope.select({data:scope.data});
					});
				});
			},
		};
	})
;
