angular.module('app')
	.config(['$compileProvider', function($compileProvider) {
		$compileProvider.imgSrcSanitizationWhitelist(/^(https?|ftp|chrome-extension|chrome):/);
	}])
	.constant('settings', {
		get: function(key, def) {
			var val = localStorage.getItem(key) || '';
			try {
				val = JSON.parse(val);
			} catch(e) {
				val = def;
			}
			return val;
		},
		set: function(key, val) {
			localStorage.setItem(key, JSON.stringify(val));
		},
	})
	.constant('constants', {
		bookmarkMarginTop: 10,
		tileHeight: 240,
		tileWidth: 250,
		tileMarginRight: 10,
		tileMarginBottom: 10,
		barHeight: 35,
		collectionHeight: 30,
	})
	.factory('viewFactory', ['$rootScope', 'constants', function($rootScope, constants) {
		var marginTop = constants.bookmarkMarginTop;
		var tileHeight = constants.tileHeight;
		var tileWidth = constants.tileWidth;
		var tileMarginRight = constants.tileMarginRight;
		var tileMarginBottom = constants.tileMarginBottom;
		var barHeight = constants.barHeight;
		var list = document.querySelector('.list');
		var callbacks = [];
		function checkView() {
			var view = $rootScope.cond.view;
			var cols = $rootScope.cond.cols;
			if (view == 'bar')
				$rootScope.cond.cols = 0;
			else if (view == 'tile')
				$rootScope.cond.cols = Math.floor(list.clientWidth / (tileWidth + tileMarginRight));
			if (cols != $rootScope.cond.cols)
				callbacks.forEach(function (cb) {cb();});
		}
		function locate(index,node){
			var cond=$rootScope.cond;
			var top;
			if(cond.view=='bar'){
				node.style.left=0;
				top=index*barHeight+marginTop;
			} else if(cond.view=='tile'){
				var row=Math.floor(index/cond.cols);
				var col=index%cond.cols;
				node.style.left=col*(tileWidth+tileMarginRight)+'px';
				top=row*(tileHeight+tileMarginBottom)+marginTop;
			}
			node.style.top=top+'px';
		}
		angular.element(window).on('resize', function (e) {
			$rootScope.$apply(checkView);
		});
		return {
			locate: locate,
			checkView: checkView,
			register: function (cb) {
				callbacks.push(cb);
			},
			unregister: function (cb) {
				var i = callbacks.indexOf(cb);
				if (i >= 0) callbacks.splice(i, 1);
			},
		};
	}])
	.factory('blurFactory', ['$rootScope', function ($rootScope) {
		function findItem(ele) {
			for (var i = 0; i < blur.length; i ++)
				if (blur[i].ele === ele) return blur[i];
		}
		var blur = [];
		angular.element(document).on('mousedown', function (e) {
			if (blur.length) $rootScope.$apply(function () {
				var _blur = blur;
				blur = [];
				angular.forEach(_blur, function (item) {
					if (item.ele.compareDocumentPosition(e.target) & 16)
						blur.push(item);
					else
						item.funcs.forEach(function (f) {f();});
				});
			});
		});
		return {
			add: function (ele, func) {
				var item = findItem(ele);
				if (item) item.funcs.push(func);
				else {
					item = {
						ele: ele,
						funcs: [func],
					};
					blur.push(item);
				}
			},
			remove: function (ele, func) {
				var item = findItem(ele);
				if (item) {
					var i = item.funcs.indexOf(func);
					if (i >= 0) item.funcs.splice(i, 1);
				}
			},
		};
	}])
	.factory('rootData', function() {
		function clear() {
			data.colUnd = {};
			data.cols = [];
			data.d_cols = {};
			data.bookmarks = [];
			data.d_bookmarks = {};
			data.selected = 0;
		}
		var data = {
			clear: clear,
		};
		clear();
		return data;
	})
	.factory('apis', ['$q', '$rootScope', /*'$timeout',*/ 'rootData',
					 function($q, $rootScope, /*$timeout,*/ rootData) {
		var port;
		function initPort() {
			port = chrome.runtime.connect({name: 'options'});
			port.onMessage.addListener(function (obj) {
				$rootScope.$apply(function () {
					var data = obj.data;
					if (obj.type == 'collection') {
						if (obj.cmd == 'update') {
							var col = rootData.d_cols[data.id];
							if (col) {
								// update
								angular.extend(col, data);
							} else {
								// add
								rootData.cols.push(data);
								rootData.d_cols[data.id] = data;
								if(!('count' in data)) data.count = 0;
							}
						} else if (obj.cmd == 'remove') {
							var col = rootData.d_cols[data];
							if (col) {
								var i = rootData.cols.indexOf(col);
								if (i >= 0) rootData.cols.splice(i, 1);
								if ($rootScope.cond.col === col)
									$rootScope.cond.col = rootData.cols[i] || rootData.colUnd;
								delete rootData.d_cols[data];
								var bookmarks = [];
								rootData.bookmarks.forEach(function(bookmark) {
									if(bookmark.col != col.id) bookmarks.push(bookmark);
									else delete rootData.d_bookmarks[bookmark.id];
								});
								rootData.bookmarks = bookmarks;
							}
						}
					} else if (obj.type == 'bookmark') {
						if (!Array.isArray(data)) data = [data];
						data.forEach(function (data) {
							if (obj.cmd == 'update') {
								var bm = rootData.d_bookmarks[data.id];
								if (bm) {
									// update
									if (data.col && bm.col != data.col) {
										rootData.d_cols[bm.col].count --;
										rootData.d_cols[data.col].count ++;
									}
									angular.extend(bm, data);
								} else {
									// add
									rootData.bookmarks.push(data);
									rootData.d_bookmarks[data.id] = data;
									rootData.d_cols[data.col].count ++;
								}
							} else if(obj.cmd == 'remove') {
								var bm = rootData.d_bookmarks[data];
								if (bm) {
									var i = rootData.bookmarks.indexOf(bm);
									if (i >= 0) rootData.bookmarks.splice(i, 1);
									delete rootData.d_bookmarks[data];
									rootData.d_cols[bm.col].count --;
								}
							}
						});
					}
				});
			});
		}
		/*function debounce(cb, delay) {
			var timer = null;
			function call() {
				cb();
				timer = null;
			}
			return function () {
				if (timer) $timeout.cancel(timer);
				timer = $timeout(call,delay);
			};
		}*/
		var apis = {
			UNDEF: -1,
			//debounce: debounce,
			stop: function (e) {
				e.preventDefault();
				e.stopPropagation();
			},
			normalizeURL: function (url) {
				if (url) {
					var parts = url.match(/^(\w+:\/\/)?([^/]+.*)$/);
					if (parts) return (parts[1] || 'http://') + parts[2];
				}
			},
			getData: function () {
				function initData(data) {
					rootData.clear();
					data.cols.forEach(function (col) {
						if (col.id == apis.UNDEF)
							rootData.colUnd = col;
						else {
							rootData.cols.push(col);
							col.draggable = true;	// allow ordering
						}
						rootData.d_cols[col.id] = col;
					});
					rootData.bookmarks = data.bm;
					data.bm.forEach(function (bm) {
						rootData.d_bookmarks[bm.id] = bm;
					});
					if (!port) initPort();
					$rootScope.$apply(function () {
						deferred.resolve();
					});
				}
				function getData() {
					chrome.runtime.sendMessage({cmd: 'GetData'}, function (data) {
						if (data) initData(data);
						else setTimeout(getData, 500);
					});
				}
				var deferred = $q.defer();
				getData();
				return deferred.promise;
			},
			saveCollection: function (col) {
				var deferred = $q.defer();
				chrome.runtime.sendMessage({cmd: 'SaveCollection', data: col}, function () {
					$rootScope.$apply(function () {
						deferred.resolve();
					});
				});
				return deferred.promise;
			},
			moveCollection: function(idxFrom, idxTo) {
				var deferred = $q.defer();
				chrome.runtime.sendMessage({
					cmd: 'MoveCollection',
					data: {
						id: rootData.cols[idxFrom].id,
						offset: idxTo - idxFrom,
					},
				}, function () {
					$rootScope.$apply(function () {
						var i = Math.min(idxFrom, idxTo);
						var j = Math.max(idxFrom, idxTo);
						var seq = [
							rootData.cols.slice(0, i),
							rootData.cols.slice(i, j + 1),
							rootData.cols.slice(j + 1),
						];
						if (i == idxTo)
							seq[1].unshift(seq[1].pop());
						else
							seq[1].push(seq[1].shift());
						var list = [];
						seq.forEach(function (seq) {list = list.concat(seq);});
						rootData.cols = list;
						deferred.resolve();
					});
				});
				return deferred.promise;
			},
			removeCollection: function (id) {
				var deferred = $q.defer();
				chrome.runtime.sendMessage({cmd: 'RemoveCollection', data: id}, function () {
					$rootScope.$apply(function () {
						deferred.resolve();
					});
				});
				return deferred.promise;
			},
			saveBookmark: function (item) {
				var deferred = $q.defer();
				chrome.runtime.sendMessage({cmd: 'SaveBookmark', data: item}, function (id) {
					$rootScope.$apply(function () {
						deferred.resolve(item);
					});
				});
				return deferred.promise;
			},
			moveToCollection: function (items, col) {
				var deferred = $q.defer();
				var ids = items.map(function (item) {return item.id;});
				chrome.runtime.sendMessage({cmd: 'MoveToCollection', data: {ids: ids, col: col}}, function () {
					$rootScope.$apply(function () {
						deferred.resolve();
					});
				});
				return deferred.promise;
			},
			removeBookmarks: function (ids) {
				var deferred = $q.defer();
				chrome.runtime.sendMessage({cmd: 'RemoveBookmarks', data: ids}, function (id) {
					$rootScope.$apply(function () {
						deferred.resolve();
					});
				});
				return deferred.promise;
			},
			logIn: function (user, pwd) {
				var deferred = $q.defer();
				chrome.runtime.sendMessage({cmd: 'LogIn', data: {user: user, pwd: pwd}}, function (data) {
					$rootScope.user = data;
					$rootScope.$apply(function () {
						deferred.resolve();
					});
				});
				return deferred.promise;
			},
			logOut: function () {
				var deferred = $q.defer();
				chrome.runtime.sendMessage({cmd: 'LogOut'}, function (data) {
					$rootScope.user = data;
					$rootScope.$apply(function () {
						deferred.resolve();
					});
				});
				return deferred.promise;
			},
			getUserInfo: function () {
				var deferred = $q.defer();
				chrome.runtime.sendMessage({cmd: 'GetUserInfo'}, function (data) {
					$rootScope.user = data;
					$rootScope.$apply(function () {
						deferred.resolve();
					});
				});
				return deferred.promise;
			},
			importFromChrome: function () {
				var deferred = $q.defer();
				chrome.runtime.sendMessage({cmd: 'ImportFromChrome'}, function () {
					deferred.resolve();
				});
				return deferred.promise;
			},
		};
		return apis;
	}])
	.directive('bookmark', ['$rootScope', 'apis', 'blurFactory', 'viewFactory', 'rootData', function ($rootScope, apis, blurFactory, viewFactory, rootData) {
		function open(data, target) {
			var url = data.url && apis.normalizeURL(data.url);
			if (url) {
				if (target == '_blank') window.open(url);
				else location.href = url;
			}
		}
		function hash(str, caseSensitive) {
	    if (!caseSensitive)
        str = str.toLowerCase();
	    // 1315423911=b'1001110011001111100011010100111'
	    var hash = 1315423911;
	    for (var i = 0; i < str.length; i ++) {
	        var ch = str.charCodeAt(i);
	        hash ^= (hash << 5) + ch + (hash >> 2);
	    }
	    //return hash & 0x7FFFFFFF;
			return hash & 0xbfbfbf;
		}
		function getItems(item) {
			return rootData.selected ? rootData.bookmarks.filter(function (item) {
				return item.selected;
			}) : [item];
		}
		function select(item) {
			if (item.selected = !item.selected) rootData.selected ++;
			else rootData.selected --;
		}
		function setIcon(node, url) {
			var m = url.match(/^\w+:\/\/([^/]*)/);
			m = m ? m[1] : url;
			node.innerHTML = '<div>' + m + '</div>';
			var color = hash(m).toString(16);
			while (color.length < 6) color = '0' + color;
			node.style.background = '#' + color;
		}
		return {
			restrict: 'E',
			replace: true,
			scope: {
				data: '=',
			},
			templateUrl: 'templates/bookmark.html',
			link: function(scope, element, attrs) {
				scope._ = _;
				scope.stop = apis.stop;
				scope.edittitle = {focus: true};
				scope.editurl = {};
				scope.cond = $rootScope.cond;
				var reset = function () {
					scope.edittitle.text = scope.data.title;
					scope.editurl.text = scope.data.url;
					setIcon(element[0].querySelector('.icon'), scope.data.url);
				};
				var blurred = false;
				element[0].querySelector('.remove').addEventListener('click', function (e) {
					e.stopPropagation();
					apis.removeBookmarks([scope.data.id]);
				}, false);
				element[0].querySelector('.edit').addEventListener('click', function (e) {
					e.stopPropagation();
					blurFactory.add(element[0], blur);
					scope.$apply(function () {
						scope.edittitle.mode = 'edit';
						scope.editurl.mode = 'edit';
					});
				});
				scope.close = function () {
					if (!blurred) blurFactory.remove(element[0], blur);
					reset();
					scope.edittitle.mode = '';
					scope.editurl.mode = '';
				};
				scope.check = function () {
					apis.saveBookmark({
						id: scope.data.id,
						title: scope.edittitle.text,
						url: scope.editurl.text,
						col: scope.data.col,
					});
					scope.close();
				};
				var blur = function () {
					blurred = true;
					scope.check();
				};
				scope.open = function () {
					open(scope.data, attrs.target);
				};
				element[0].querySelector('.select').addEventListener('click', function (e) {
					e.stopPropagation();
					scope.$apply(function () {select(scope.data);});
				}, false);
				element.on('dragstart', function (e) {
					scope.$apply(function () {
						if (scope.cond.view == 'tile')
							e.dataTransfer.setDragImage(e.target.querySelector('.icon'), -10, -10);
						rootData.dragging = 'bookmarks';
						getItems(scope.data).forEach(function (item) {item.dragging = true;});
					});
				}).on('dragend', function (e) {
					scope.$apply(function () {
						getItems(scope.data).forEach(function (item) {
							item.dragging = false;
							item.selected = false;
						});
						rootData.selected = 0;
					});
				});
				var locate = function () {
					viewFactory.locate(scope.$parent.$index, element[0]);
				};
				scope.$watch('data', reset, true);
				scope.$watch('$parent.$index', locate);
				viewFactory.register(locate);
				element.bind('$destroy', function () {
					viewFactory.unregister(locate);
				});
			},
		};
	}])
	.directive('editable', ['$rootScope', 'apis', 'blurFactory', function($rootScope, apis, blurFactory) {
		return {
			restrict: 'E',
			replace: true,
			scope: {
				data: '=',
				placeholder: '@',
				button: '@',
				change: '&',
				cancel: '&',
				wrap: '@',
			},
			templateUrl: 'templates/editable.html',
			link: function(scope, element, attrs) {
				scope.stop = apis.stop;
				scope.cond = $rootScope.cond;
				scope.submit = function () {
					if (scope.data.text) {
						scope.change();
						scope.data.mode = '';
					}
				};
				var cancel = function (blurred) {
					if (attrs.blur && !blurred) blurFactory.remove(element[0], blur);
					scope.cancel();
					scope.data.mode = '';
				};
				var blur = function() {
					if (attrs.blur == 'change') scope.submit();
					cancel(true);
				};
				scope.$watch('data.mode', function () {
					// this is also called when data is changed to null
					if (scope.data && scope.data.mode == 'edit') {
						if (attrs.blur) blurFactory.add(element[0], blur);
						setTimeout(function () {
							var input = element[0].querySelector('.edit');
							if (scope.data.focus) {
								input.select();
								input.focus();
							}
							angular.element(input).on('keydown', function (e) {
								scope.$apply(function () {
									if (e.keyCode == 27) cancel();
									else if (e.keyCode == 13) scope.submit();
									else return;
									e.preventDefault();
								});
							});
						}, 0);
					}
				});
			},
		};
	}])
	.directive('collection', ['$rootScope', 'apis', 'rootData', function ($rootScope, apis, rootData) {
		return {
			templateUrl: 'templates/collection.html',
			replace: true,
			restrict: 'E',
			scope: {
				data: '=',
			},
			link: function(scope, element, attrs) {
				scope.stop = apis.stop;
				scope.cond = $rootScope.cond;
				if (scope.data.change) {
					scope.editdata = {focus: true};
					scope.editCol = function () {
						scope.editdata.mode = 'edit';
					};
					scope.close = function () {
						scope.editdata.text = scope.data.title;
					};
					scope.check = function () {
						if (scope.editdata.text) {
							if (scope.editdata.text != scope.data.title) {
								apis.saveCollection({
									id: scope.data.id,
									title: scope.editdata.text,
								});
							}
							scope.close();
							return true;
						}
					};
					scope.removeCol = function () {
						if (confirm(_('confirmCollectionRemove', [scope.data.title])))
							apis.removeCollection(scope.data.id);
					};
					scope.$watch('data.title', function () {
						scope.editdata.text = scope.data.title;
					});
				}
				var dragcount = 0;
				element.on('click', function () {
					scope.$apply(function () {
						$rootScope.selectCollection(scope.data);
					});
				}).on('dragover', function (e) {
					if (['bookmarks'].indexOf(rootData.dragging) >= 0)
						e.preventDefault();
				}).on('dragenter', function (e) {
					dragcount ++;
					if (dragcount == 1) scope.$apply(function () {
						scope.data.dragover = true;
					});
				}).on('dragleave', function (e) {
					dragcount --;
					if (dragcount == 0) scope.$apply(function () {
						scope.data.dragover = false;
					});
				}).on('drop', function (e) {
					dragcount = 0;
					if (rootData.dragging == 'bookmarks') {
						scope.data.dragover = false;
						var items = rootData.bookmarks.filter(function (item) {return item.dragging;});
						apis.moveToCollection(items, scope.data.id);
					}
					rootData.dragging = null;
				});
			},
		};
	}])
	.directive('listview', function () {
		return {
			template: '<div class="listview" ng-transclude></div>',
			replace: true,
			transclude: true,
			restrict: 'E',
			scope: {
				getpos: '&',
				getindex: '&',
				moved: '&',
			},
			controller: ['$scope', '$element', function($scope, $element) {
				var dragging = {}, children;
				function mousemove(e) {
					dragging.node.css({
						left: e.clientX - dragging.offsetX + 'px',
						top: e.clientY - dragging.offsetY + 'px',
					});
					var i = $scope.getindex({
						x: e.clientX - dragging.offsetX + e.offsetX,
						y: e.clientY - dragging.offsetY + e.offsetY,
					});
					if (i >= 0 && i < children.length && i != dragging.index) {
						var cur = dragging.index;
						var step = i > cur ? 1 : -1;
						while (i != cur) {
							cur += step;
							var j = cur;
							if (step * (j - dragging.idxFrom) <= 0) j -= step;
							angular.element(children[j]).css($scope.getpos({index: cur - step}));
						}
						dragging.index = i;
					}
				}
				function mouseup(e) {
					dragging.node.removeClass('dragging');
					dragging.node.css($scope.getpos({index: dragging.index}));
					if (dragging.index != dragging.idxFrom)
						$scope.moved({idxFrom: dragging.idxFrom, idxTo: dragging.index});
					children = null;
					dragging.node = null;
					$element.off('mousemove').off('mouseup');
				}
				this.getpos = function (index) {
					return $scope.getpos({index: index});
				};
				this.drag = function(e, index, element) {
					if (dragging.node) return;
					children = $element.children('.nested');
					dragging.node = element;
					element.addClass('dragging');
					dragging.offsetX = e.clientX - element[0].offsetLeft;
					dragging.offsetY = e.clientY - element[0].offsetTop;
					dragging.idxFrom = dragging.index = index;
					$element
						.on('mousemove', mousemove)
						.on('mouseup', mouseup);
				};
			}],
		};
	})
	.directive('nested', function () {
		return {
			require: '^listview',
			restrict: 'A',
			link: function (scope, element, attrs, listview) {
				var locate = function () {
					element.css(listview.getpos(scope.$index));
				};
				element.addClass('nested')
					.on('dragstart', function (e) {
						e.preventDefault();
						listview.drag(e, scope.$index, element);
					});
				scope.$watch('$index', locate);
			},
		};
	})
;
