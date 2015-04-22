angular.module('app')
	.config(function($compileProvider){
		$compileProvider.imgSrcSanitizationWhitelist(/^(https?|ftp|chrome-extension):/);
	})
	.factory('blurFactory',function(){
		var blur=[];
		function findItem(ele){
			for(var i=0;i<blur.length;i++)
				if(blur[i].ele===ele) return blur[i];
		}
		angular.element(document).on('mousedown', function(e){
			if(blur.length) {
				var _blur=blur;
				blur=[];
				angular.forEach(_blur, function(item){
					if(item.ele.compareDocumentPosition(e.target)&16)
						blur.push(item);
					else
						item.funcs.forEach(function(f){f();});
				});
			}
		});
		return {
			add:function(ele,func){
				var item=findItem(ele);
				if(item) item.funcs.push(func);
				else {
					item={
						ele:ele,
						funcs:[func],
					};
					blur.push(item);
				}
			},
			remove:function(ele,func){
				var item=findItem(ele);
				if(item) {
					var i=item.funcs.indexOf(func);
					if(i>=0) item.funcs.splice(i,1);
				}
			},
		};
	})
	.factory('apis',function($q,$rootScope){
		var apis={
			UNDEF: -1,
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
				data.colUnd={};
				data.cols=[];
				data.d_cols={};
				chrome.runtime.sendMessage({cmd:'GetCollections',data:{count:true}},function(cols){
					cols.forEach(function(col){
						if(col.id==apis.UNDEF)
							data.colUnd=col;
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
			removeCollection: function(id){
				var deferred=$q.defer();
				var data=$rootScope.data;
				chrome.runtime.sendMessage({cmd:'RemoveCollection',data:id},function(){
					var col=data.d_cols[id];
					var i=data.cols.indexOf(col);
					data.cols.splice(i,1);
					if(id===$rootScope.cond.col)
						$rootScope.cond.col=(data.cols[i]||data.colUnd).id;
					delete data.d_cols[id];
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
				data.selected=0;
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
			saveBookmark: function(item){
				var deferred=$q.defer();
				var data=$rootScope.data;
				chrome.runtime.sendMessage({cmd:'SaveBookmark',data:item},function(id){
					if(item.id) {
						angular.extend(data.d_bookmarks[item.id],item);
					} else {
						item.id=id;
						data.d_cols[item.col].count++;
						data.d_bookmarks[item.id]=item;
						data.bookmarks.push(item);
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
			removeBookmarks: function(ids){
				var deferred=$q.defer();
				var data=$rootScope.data;
				chrome.runtime.sendMessage({cmd:'RemoveBookmarks',data:ids},function(id){
					ids.forEach(function(id){
						var item=data.d_bookmarks[id];
						var i=data.bookmarks.indexOf(item);
						data.d_cols[item.col].count--;
						data.bookmarks.splice(i,1);
						delete data.d_bookmarks[id];
					});
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
	.directive('bookmark',function($rootScope,apis,blurFactory){
		function open(data,target){
			var url=data.url&&apis.normalizeURL(data.url);
			if(url) {
				if(target=='_blank') window.open(url);
				else location.href=url;
			}
		}
		function getIcon(data){
			return data.icon||'/images/icon16.png';
		}
		return {
			restrict:'E',
			replace:true,
			scope:{
				data:'=',
			},
			templateUrl:'templates/bookmark.html',
			link:function(scope,element,attrs){
				scope.getIcon=getIcon;
				scope.stop=apis.stop;
				scope.edittitle={focus:true};
				scope.editurl={};
				var reset=function(){
					scope.edittitle.text=scope.data.title;
					scope.editurl.text=scope.data.url;
				},blurred=false;
				scope.remove=function(){
					apis.removeBookmarks([scope.data.id]);
				};
				scope.edit=function(){
					scope.edittitle.mode='edit';
					scope.editurl.mode='edit';
					blurFactory.add(element[0],blur);
				};
				scope.close=function(){
					if(!blurred) blurFactory.remove(element[0],blur);
					reset();
					scope.edittitle.mode='';
					scope.editurl.mode='';
				};
				scope.check=function(){
					apis.saveBookmark({
						id: scope.data.id,
						title: scope.edittitle.text,
						url: scope.editurl.text,
						col: scope.data.col,
					});
					scope.close();
				};
				var blur=function(){
					blurred=true;
					scope.check();
				};
				scope.open=function(){
					open(scope.data,attrs.target);
				};
				scope.select=function(){
					if(scope.data.selected=!scope.data.selected)
						$rootScope.data.selected++;
					else
						$rootScope.data.selected--;
				};
				scope.$watch('data',reset,true);
			},
		};
	})
	.directive('editable', function($rootScope,apis,blurFactory){
		return {
			restrict: 'E',
			replace: true,
			scope: {
				data: '=',
				placeholder: '@',
				button: '@',
				change: '&',
				cancel: '&',
			},
			templateUrl: 'templates/editable.html',
			link: function(scope, element, attrs) {
				scope.stop=apis.stop;
				scope.checkSubmit=function() {
					if(scope.data.text) {
						scope.change();
						scope.data.mode='';
					}
				};
				var cancel=function(blurred) {
					if(attrs.blur&&!blurred) blurFactory.remove(element[0],blur);
					scope.cancel();
					scope.data.mode='';
				};
				var blur=function() {
					if(attrs.blur=='change') scope.change();
					cancel(true);
				};
				scope.$watch('data.mode',function(){
					if(scope.data.mode=='edit') {
						if(attrs.blur) blurFactory.add(element[0],blur);
						var input=element[0].querySelector('.edit');
						angular.element(input).on('keydown',function(e){
							if(e.keyCode==27) scope.$apply(cancel);
						});
						if(scope.data.focus) setTimeout(function(){
							input.select();input.focus();
						},0);
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
			},
			link: function(scope, element, attrs) {
				scope.stop=apis.stop;
				scope.edit=attrs.change;
				scope.cond=$rootScope.cond;
				if(attrs.change) {
					scope.editdata={focus:true};
					scope.editCol=function(){
						scope.editdata.mode='edit';
					};
					scope.close=function(){
						scope.editdata.text=scope.data.title;
					};
					scope.check=function(){
						if(scope.editdata.text) {
							if(scope.editdata.text!=scope.data.title) {
								apis.saveCollection({
									id:scope.data.id,
									title:scope.editdata.text,
								});
							}
							scope.close();
							return true;
						}
					};
					scope.removeCol=function(){
						if(confirm('您确定要删除以下频道及其中的所有书签吗？\n\n'+scope.data.title))
							apis.removeCollection(scope.data.id);
					};
					scope.$watch('data.title',function(){
						scope.editdata.text=scope.data.title;
					});
				}
				element.on('click',function(){
					scope.$apply(function(){
						$rootScope.cond.col=scope.data.id;
					});
				});
			},
		};
	})
;
