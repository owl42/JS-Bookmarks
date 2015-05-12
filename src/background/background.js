function initDb(callback){
	var request=indexedDB.open('sunshine',3);
	request.onsuccess=function(e){db=request.result;if(callback) callback();};
	request.onerror=function(e){console.log('IndexedDB error: '+e.target.error.message);};
	request.onupgradeneeded=function(e){
		var r=e.currentTarget.result,o;
		if(!r.objectStoreNames.contains('collections')) {
			// collections: id title pos
			o=r.createObjectStore('collections',{keyPath:'id',autoIncrement:true});
			o.createIndex('pos','pos',{unique:false});	// should be unique at last
		}
		if(!r.objectStoreNames.contains('bookmarks')) {
			// bookmarks: id title url col
			// deprecated: desc, tags
			o=r.createObjectStore('bookmarks',{keyPath:'id',autoIncrement:true});
			o.createIndex('col','col',{unique:false});
			// o.createIndex('tag','tags',{multiEntry:true});
		}
		if(!r.objectStoreNames.contains('settings')) {
			// settings: key data
			o=r.createObjectStore('settings',{keyPath:'key'});
		}
		if(e.oldVersion<3) {
			o=e.currentTarget.transaction.objectStore('bookmarks');
			o.createIndex('url','url',{unique:false});
		}
	};
}

var UNDEF=-1,pos=0;
function userCollection(data){
	var col={
		id:data.id,
		title:data.title,
		change:true,	// allow modification
		count:0,
	};
	if('count' in data) col.count=data.count;
	return col;
}
function getCollections(data,src,callback){
	data=[
		{
			id:UNDEF,
			title:'默认频道',
		},
	];
	var o=db.transaction('collections','readwrite').objectStore('collections');
	pos=0;
	var updates={};
	o.index('pos').openCursor().onsuccess=function(e){
		var r=e.target.result;
		if(r) {
			var v=r.value;
			if(!updates[v.id]) {
				data.push(userCollection({
					id:v.id,
					title:v.title,
				}));
				if(v.pos!=++pos) {
					updates[v.id]=v.pos=pos;
					r.update(v).onsuccess=function(){
						r.continue();
					};
					return;
				}
			}
			r.continue();
		} else
			callback(data);
	};
	return true;
}
function getData(data,src,callback){
	function getBookmarkData(){
		var o=db.transaction('bookmarks').objectStore('bookmarks');
		o.openCursor().onsuccess=function(e){
			var r=e.target.result;
			if(r) {
				var v=r.value;
				var col=h[v.col]||h[UNDEF];
				col.count++;
				data.bm.push(v);
				r.continue();
			} else callback(data);
		};
	}
	data={bm:[]};
	var h={};
	getCollections(null,null,function(cols){
		data.cols=cols;
		cols.forEach(function(col){
			h[col.id]=col;
		});
		getBookmarkData();
	});
	return true;
}
function moveCollection(data,src,callback){
	var o=db.transaction('collections','readwrite').objectStore('collections');
	o.get(data.id).onsuccess=function(e){
		var r=e.target.result,k,s,x=r.pos;
		if(data.offset<0) {
			k=IDBKeyRange.upperBound(x,true);
			s='prev';
			data.offset=-data.offset;
		} else {
			k=IDBKeyRange.lowerBound(x,true);
			s='next';
		}
		o.index('pos').openCursor(k,s).onsuccess=function(e){
			var p=e.target.result,v;
			if(p) {
				data.offset--;
				v=p.value;v.pos=x;x=p.key;
				p.update(v);
				if(data.offset)
					return p.continue();
				else {
					r.pos=x;o.put(r);
				}
			}
			callback();
		};
	};
	return true;
}
function removeCollection(id,src,callback){
	/* data: {
	 *   id: id of collection to be removed
	 *   moveTo: id of collection to hold the bookmarks in this collection
	 * }
	 */
	function removeCollection(){
		var o=db.transaction('collections','readwrite').objectStore('collections');
		o.delete(id).onsuccess=function(e){
			if(urls.length) updateStars({
				url:urls,
				star:false,
			});
			callback();
			updateOptions({
				type:'collection',
				cmd:'remove',
				data:id,
			});
		};
	}
	function removeBookmarks(){
		var o=db.transaction('bookmarks','readwrite').objectStore('bookmarks');
		o.index('col').openCursor(id).onsuccess=function(e){
			var r=e.target.result;
			if(r) {
				urls.push(r.value.url);
				r.delete().onsuccess=function(e){
					r.continue();
				};
			} else removeCollection();
		};
	}
	var urls=[];
	removeBookmarks();
	return true;
}
function getBookmark(data,src,callback){
	var o=db.transaction('bookmarks').objectStore('bookmarks');
	o.index('url').get(data).onsuccess=function(e){
		// result may be undefined if not found
		callback(e.target.result);
	};
	return true;
}
function getBookmarks(data,src,callback){
	var bm=[],o=db.transaction('bookmarks').objectStore('bookmarks');
	o.openCursor().onsuccess=function(e){
		var r=e.target.result;
		if(r) {
			bm.push(r.value);
			r.continue();
		} else callback(bm);
	};
	return true;
}
function saveCollection(data,src,callback){
	var col={
		title:data.title||'未命名',
		icon:data.icon||'',
		pos:data.pos,
	};
	if(data.id) col.id=data.id;
	if(!col.pos) col.pos=++pos;
	var o=db.transaction('collections','readwrite').objectStore('collections');
	o.put(col).onsuccess=function(e){
		col.id=e.target.result;
		if(!data.id) col.count=0;
		callback(col.id);
		updateOptions({
			type:'collection',
			cmd:'update',
			data:userCollection(col),
		});
	};
	return true;
}
function saveBookmark(data,src,callback){
	var bm={
		title:data.title||'未命名',
		url:data.url||'',
		//desc:data.desc||'',
		//tags:data.tags||[],
		col:data.col||UNDEF,
	};
	if(data.id) bm.id=data.id;
	var o=db.transaction('bookmarks','readwrite').objectStore('bookmarks');
	o.put(bm).onsuccess=function(e){
		if(data.updateStar) updateStars({
			url:data.url,
			star:true,
		});
		callback();
		bm.id=e.target.result;
		updateOptions({
			type:'bookmark',
			cmd:'update',
			data:bm,
		});
	};
	return true;
}
function moveToCollection(data,src,callback){
	function move(){
		var id=ids.pop();
		if(id){
			o.get(id).onsuccess=function(e){
				var r=e.target.result;
				r.col=data.col||UNDEF;
				items.push({id:id,col:r.col});
				o.put(r).onsuccess=move;
			};
		} else {
			callback();
			updateOptions({
				type:'bookmark',
				cmd:'update',
				data:items,
			})
		}
	}
	var ids=data.ids;
	var items=[];
	var o=db.transaction('bookmarks','readwrite').objectStore('bookmarks');
	move();
	return true;
}
function removeBookmarks(ids,src,callback){
	function removeOne(){
		var id=ids.shift();
		if(id) o.get(id).onsuccess=function(e){
			var v=e.target.result;
			urls.push(v.url);
			o.delete(id).onsuccess=removeOne;
		}; else {
			if(urls.length) updateStars({
				url:urls,
				star:false,
			});
			callback();
			updateOptions({
				type:'bookmark',
				cmd:'remove',
				data:removed,
			});
		}
	}
	var removed=ids.slice();
	var urls=[];
	var o=db.transaction('bookmarks','readwrite').objectStore('bookmarks');
	removeOne();
	return true;
}

function getSettings(key,def,callback){
	var o=db.transaction('settings').objectStore('settings');
	var r=o.get(key);
	r.onsuccess=function(e){
		var v=e.target.result;
		// v might be undefined
		callback(v);
	};
	r.onerror=function(e){
		callback(def);
	};
}
function setSettings(key,val,callback){
	var o=db.transaction('settings','readwrite').objectStore('settings');
	o.put({key:key,data:val}).onsuccess=function(e){
		callback();
	};
}
function getUserInfo(data,src,callback){
	if(user) callback(user);
	else {
		getSettings('user',{id:0},function(data){
			if(data) user=data.data;
			callback(user);
		});
		return true;
	}
}
function logIn(data,src,callback){
	user={
		id:1,
		name:'Gerald',
		avatar:'http://cn.gravatar.com/avatar/a0ad718d86d21262ccd6ff271ece08a3?s=80',
	};
	setSettings('user',user,function(){
		callback(user);
	});
	return true;
}
function logOut(data,src,callback){
	// send log out request
	user={id:0};
	setSettings('user',user,function(){
		callback(user);
	});
	return true;
}

function importFromChrome(data,src,callback){
	function importTree(folder,cb){
		importNodes(folder.children,{
			getCol:function(cb){
				saveCollection({title:folder.title},null,cb);
			},
		},cb);
	}
	function importBookmark(item,col,cb){
		function doImport(){
			urls.push(item.url);
			saveBookmark({title:item.title,url:item.url,col:col.id},null,function(){
				cb();
			});
		}
		col=col||{};
		if(col.getCol) col.getCol(function(data){
			delete col.getCol;
			col.id=data;
			doImport();
		}); else doImport();
	}
	function importNodes(arr,col,cb){
		function importNode(){
			var item=arr.shift();
			if(item) {
				if(item.url)
					importBookmark(item,col,importNode);
				else if(item.title)
					importTree(item,importNode);
				else
					// root node
					importNodes(item.children,null,importNode);
			} else cb();
		}
		arr=arr.concat();
		importNode();
	}
	function finish(){
		callback();
		new Notification('书签导入 - '+chrome.i18n.getMessage('extName'),{
			body:'从Chrome导入'+urls.length+'个书签！',
			icon:chrome.extension.getURL('images/logo-128.png'),
		});
		if(urls.length) updateStars({
			url:urls,
			star:true,
		});
	}
	var urls=[];
	chrome.bookmarks.getTree(function(arr){
		importNodes(arr,null,finish);
	});
	return true;
}
function getStarImage(star){
	return chrome.extension.getURL(star?'images/star.svg':'images/unstar.svg');
}
function updateStars(data){
	var icon=getStarImage(data.star);
	chrome.tabs.query({url:data.url},function(tabs){
		tabs.forEach(function(tab){
			chrome.pageAction.setIcon({
				tabId: tab.id,
				path: icon,
			},function(){
				chrome.pageAction.show(tab.id);
			});
		});
	});
}

var db,user=null;
initDb(function(){
	chrome.runtime.onMessage.addListener(function(req,src,callback){
		var mappings={
			SaveBookmark:saveBookmark,
			// for popup only
			GetCollections:getCollections,
			GetBookmark:getBookmark,
			// for options only
			GetData:getData,
			GetBookmarks:getBookmarks,
			SaveCollection:saveCollection,
			MoveCollection:moveCollection,
			MoveToCollection:moveToCollection,
			RemoveBookmarks:removeBookmarks,
			RemoveCollection:removeCollection,
			GetUserInfo:getUserInfo,
			LogIn:logIn,
			LogOut:logOut,
			ImportFromChrome:importFromChrome,
		},f=mappings[req.cmd];
		if(f) return f(req.data,src,callback);
	});
	chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
		if(tab.url) {
			if(/^(http|ftp)s?:/i.test(tab.url))
				getBookmark(tab.url,null,function(bookmark){
					chrome.pageAction.setIcon({
						tabId: tabId,
						path: getStarImage(bookmark),
					},function(){
						chrome.pageAction.show(tabId);
					});
				});
			else chrome.pageAction.hide(tabId);
		}
	});
});

var ports=[];
chrome.runtime.onConnect.addListener(function(port){
	ports.push(port);
	port.onDisconnect.addListener(function(){
		var i=ports.indexOf(port);
		if(i>=0) ports.splice(i,1);
	})
});
function updateOptions(data) {
	/**
	 * data = {
	 *   type: bookmark/collection
	 *   cmd: update/remove
	 *   data: object
	 * }
	 */
	for(var i=0;i<ports.length;i++) {
		var port=ports[i];
		try {
			port.postMessage(data);
		} catch(e) {
			port=ports.pop();
			if(i<ports.length) ports[i]=port;
			i--;
		}
	}
}
