angular.module('app')
	.config(function($compileProvider){
		$compileProvider.imgSrcSanitizationWhitelist(/^(https?|ftp|chrome-extension|chrome):/);
	})
	.factory('settings',function(){
		return {
			get: function(key,def){
				var val=localStorage.getItem(key)||'';
				try{
					val=JSON.parse(val);
				}catch(e){
					val=def;
				}
				return val;
			},
			set: function(key,val){
				localStorage.setItem(key,JSON.stringify(val));
			},
		};
	})
	.factory('viewFactory',function($rootScope,$timeout){
		var marginTop=10;
		var tileHeight=240;
		var tileWidth=250;
		var tileMarginRight=10;
		var tileMarginBottom=10;
		var barHeight=35;
		var list=document.querySelector('.list');
		var checkView=function(){
			var view=$rootScope.cond.view;
			if(view=='bar')
				$rootScope.cond.cols=0;
			else if(view=='tile') {
				$rootScope.cond.cols=Math.floor(list.clientWidth/(tileWidth+tileMarginRight));
			}
		};
		/*function delayed(cb,delay){
			var timer=null;
			function call(){
				cb();
				timer=null;
			}
			return function(){
				if(timer) $timeout.cancel(timer);
				timer=$timeout(call,delay);
			};
		}*/
		function locate(index,node){
			var cond=$rootScope.cond;
			var firstShow=node.style.opacity!='1';
			var delta,top;
			if(cond.view=='bar'){
				node.style.left=0;
				top=index*barHeight+marginTop;
				delta=35;
			} else if(cond.view=='tile'){
				var row=Math.floor(index/cond.cols);
				var col=index%cond.cols;
				node.style.left=col*(tileWidth+tileMarginRight)+'px';
				top=row*(tileHeight+tileMarginBottom)+marginTop;
				delta=200;
			}
			if(firstShow) {
				top-=delta;
				node.style.opacity=0;
				setTimeout(function(){
					top+=delta;
					node.style.top=top+'px';
					node.style.opacity=1;
				},0);
			}
			node.style.top=top+'px';
		}
		angular.element(window).on('resize',function(e){
			$rootScope.$apply(checkView);
		});
		return {
			locate:locate,
			checkView:checkView,
		};
	})
	.factory('blurFactory',function($rootScope){
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
				$rootScope.$apply();
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
			getData: function(){
				var deferred=$q.defer();
				var data=$rootScope.data;
				data.colUnd={};
				data.cols=[];
				data.d_cols={};
				data.bookmarks=[];
				data.d_bookmarks={};
				data.selected=[];
				chrome.runtime.sendMessage({cmd:'GetData'},function(d){
					d.cols.forEach(function(col){
						if(col.id==apis.UNDEF)
							data.colUnd=col;
						else
							data.cols.push(col);
						data.d_cols[col.id]=col;
					});
					data.bookmarks=d.bm;
					d.bm.forEach(function(bm){
						data.d_bookmarks[bm.id]=bm;
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
						data.d_cols[item.col].count--;
						data.d_cols[item.col=col].count++;
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
						data.bookmarks.splice(i,1);
						data.d_cols[item.col].count--;
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
			importFromChrome: function(){
				var deferred=$q.defer();
				chrome.runtime.sendMessage({cmd:'ImportFromChrome'},function(){
					apis.getData().then(function(){
						deferred.resolve();
					})
				});
				return deferred.promise;
			}
		};
		return apis;
	})
	.directive('bookmark',function($rootScope,apis,blurFactory,viewFactory){
		function open(data,target){
			var url=data.url&&apis.normalizeURL(data.url);
			if(url) {
				if(target=='_blank') window.open(url);
				else location.href=url;
			}
		}
		function hash(str, caseSensitive) {
	    if(!caseSensitive)
        str=str.toLowerCase();
	    // 1315423911=b'1001110011001111100011010100111'
	    var hash=1315423911,i,ch;
	    for (i=0;i<str.length;i++) {
	        ch=str.charCodeAt(i);
	        hash^=((hash << 5) + ch + (hash >> 2));
	    }
	    //return hash & 0x7FFFFFFF;
			return hash & 0xbfbfff;
		}
		function setIcon(node,url){
			var m=url.match(/^\w+:\/\/([^/]*)/);
			m=m?m[1]:url;
			node.innerHTML='<div>'+m+'</div>';
			var color=hash(m).toString(16);
			while(color.length<6) color='0'+color;
			node.style.background='#'+color;
		}
		return {
			restrict:'E',
			replace:true,
			scope:{
				data:'=',
			},
			templateUrl:'templates/bookmark.html',
			link:function(scope,element,attrs){
				scope.stop=apis.stop;
				scope.edittitle={focus:true};
				scope.editurl={};
				scope.cond=$rootScope.cond;
				var reset=function(){
					scope.edittitle.text=scope.data.title;
					scope.editurl.text=scope.data.url;
					setIcon(element[0].querySelector('.icon'),scope.data.url);
				},blurred=false;
				element[0].querySelector('.remove').addEventListener('click',function(e){
					e.stopPropagation();
					apis.removeBookmarks([scope.data.id]);
				},false);
				element[0].querySelector('.edit').addEventListener('click',function(e){
					e.stopPropagation();
					blurFactory.add(element[0],blur);
					scope.$apply(function(){
						scope.edittitle.mode='edit';
						scope.editurl.mode='edit';
					});
				});
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
				element[0].querySelector('.select').addEventListener('click',function(e){
					e.stopPropagation();
					var selected=$rootScope.data.selected;
					scope.$apply(function(){
						if(scope.data.selected=!scope.data.selected)
							selected.push(scope.data);
						else {
							var i=selected.indexOf(scope.data);
							selected.splice(i,1);
						}
					});
				},false);
				var locate=function(){
					viewFactory.locate(scope.$parent.$index,element[0]);
				};
				scope.$watch('data',reset,true);
				scope.$watch('$parent.$index',locate);
				scope.$watch('cond.cols',locate);
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
	.directive('collection',function($rootScope,apis){
		return {
			templateUrl: 'templates/collection.html',
			replace: true,
			restrict: 'E',
			scope: {
				data: '=',
				select: '&',
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
					scope.$apply(function(){scope.select({data:scope.data});});
				});
			},
		};
	})
;
