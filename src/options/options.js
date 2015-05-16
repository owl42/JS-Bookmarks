var _ = chrome.i18n.getMessage;

angular.module('app', ['ngAnimate'])
	.run(['$rootScope', 'apis', 'rootData', function ($rootScope, apis, rootData) {
		$rootScope._ = _;
		$rootScope.cond = {};
		$rootScope._collections = apis.getData().then(function () {
			$rootScope.cond.col = rootData.colUnd;
		});
		$rootScope.selectCollection = function (data) {
			$rootScope.cond.search = '';
			$rootScope.cond.col = data;
		};
		apis.getUserInfo();
	}])
	.controller('SideController', ['$scope', '$rootScope', 'apis', 'rootData', 'constants',
							function ($scope, $rootScope, apis, rootData, constants) {
		$scope.root = rootData;
		$scope.isActive = function (item) {
			return $rootScope.cond.col === item;
		};
		$scope.newCol = {
			text: '',
			placeholder: _('placeholderNewCollection'),
			focus: true,
		};
		$scope.startAddCol = function (e) {
			apis.stop(e);
			$scope.newCol.mode = 'edit';
		};
		$scope.addCol = function () {
			if ($scope.newCol.text) {
				apis.saveCollection({
					id: 0,
					title: $scope.newCol.text,
				}).then(function () {
					$scope.newCol.text = '';
				});
			}
		};
		$scope.cancelAddCol = function () {
			$scope.newCol.mode = '';
			$scope.newCol.text = '';
		};
		var collectionHeight = constants.collectionHeight;
		$scope.getPos = function (index) {
			var css = {
				left: 0,
				top: index * collectionHeight + 'px',
			};
			return css;
		};
		$scope.getIndex = function (x, y) {
			var i = Math.floor(y / collectionHeight);
			var lower = i * collectionHeight;
			var upper = lower + collectionHeight;
			var threshold = 3;
			return y >= lower + threshold && y <= upper - threshold ? i : -1;
		};
		$scope.moved = apis.moveCollection;
	}])
	.controller('menuController', ['$scope', '$element', 'blurFactory', 'apis', 'settings',
							function ($scope, $element, blurFactory, apis, settings) {
		function locate(loc) {
			var css = {
				left: 'auto',
				right: 'auto',
				top: 'auto',
				bottom: 'auto',
			};
			if ('right' in loc) {
				css.right = loc.right;
				if (css.right < 0) css.right = 0;
				css.right += 'px';
			} else {
				css.left = loc.left || 0;
				if (css.left < 0) css.left = 0;
				css.left += 'px';
			}
			if ('top' in loc) {
				css.top = loc.top;
				if (css.top < 0) css.top = 0;
				css.top += 'px';
			} else {
				css.bottom = loc.bottom || 0;
				if (css.bottom < 0) css.bottom = 0;
				css.bottom += 'px';
			}
			$element.css(css);
		}
		var dragging;
		var moveMenu = function (e) {
			var left = e.clientX - dragging.offsetX;
			var top = e.clientY - dragging.offsetY;
			var loc = dragging.loc = {};
			if (left < window.innerWidth / 2) loc.left = left;
			else loc.right = window.innerWidth - $element[0].offsetWidth - left;
			if (top < window.innerHeight / 2) loc.top = top;
			else loc.bottom = window.innerHeight - $element[0].offsetHeight - top;
			locate(loc);
		};
		var moveMenuEnd = function (e) {
			settings.set('menuLocation', dragging.loc);
			dragging = null;
			angular.element(document)
				.off('mousemove', moveMenu)
				.off('mouseup', moveMenuEnd);
		};
		$element.on('dragstart', function (e) {
			e.preventDefault();
			if (!dragging) {
				dragging = {
					offsetX: e.offsetX,
					offsetY: e.offsetY,
				};
				angular.element(document)
					.on('mousemove', moveMenu)
					.on('mouseup', moveMenuEnd);
			}
		});
		locate(settings.get('menuLocation', {left: 20, bottom: 20}));
		var menuShrink = function () {
			$scope.menuExpanded = false;
		};
		$scope.menuExpand = function () {
			if ($scope.menuExpanded = !$scope.menuExpanded)
				blurFactory.add($element[0], menuShrink);
			else
				menuShrink();
		};
		$scope.importFromChrome = function () {
			if (!$scope.importing) {
				$scope.importing = true;
				apis.importFromChrome().then(function () {
					$scope.importing = false;
				});
			}
		};
		angular.forEach(document.querySelector('.menu-expand').children, function (ele, i) {
			ele.style.left = (i + 1) * 50 + 'px';
		});
		// XXX
		$scope.loadWebsite = function () {
			alert('We do not have a website yet!');
		};
	}])
	.controller('BookmarksController', ['$scope', '$rootScope', 'apis', 'settings', 'viewFactory', 'rootData', 'blurFactory',
							function($scope, $rootScope, apis, settings, viewFactory, rootData, blurFactory) {
		$scope.usershown = false;
		var user = document.querySelector('.user');
		var hideUser = function () {
			$scope.usershown = false;
			$scope.showUser = showUser;
		};
		var showUser = function () {
			$scope.showUser = null;
			$scope.usershown = true;
			blurFactory.add(user, hideUser);
		};
		$scope.showUser = showUser;
		$scope.login = function () {
			apis.logIn();
		};
		$scope.logout = function () {
			apis.logOut();
		};
		$scope.root = rootData;
		$rootScope.cond.search = '';
		$scope.setView = function (view) {
			$rootScope.cond.view = view;
			settings.set('view', view);
			viewFactory.checkView();
		};
		$scope.setView(settings.get('view', 'tile'));
		$scope.reset = function () {
			$rootScope.cond.search = '';
			document.querySelector('.search>input').focus();
		};
		$scope.deselect = function () {
			angular.forEach(rootData.bookmarks, function (b) {
				b.selected = false;
			});
			rootData.selected = 0;
		};
		$scope.multiremove = function () {
			if (confirm(_('confirmBookmarkMultiremove', [rootData.selected]))) {
				var ids = rootData.bookmarks.filter(function (item) {
					return item.selected;
				}).map(function (item) {
					return item.id;
				});
				apis.removeBookmarks(ids);
			}
		};
		$scope.bmFilter = function (item) {
			var search = $rootScope.cond.search;
			if (search) {
				search = search.toLowerCase();
				return [item.title, item.url].some(function (data) {
					return data.toLowerCase().indexOf(search) >= 0;
				});
			} else {
				return $rootScope.cond.col.id === item.col;
			}
		};
	}])
;
