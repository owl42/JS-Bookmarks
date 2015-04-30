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

/*function getSearchEngines(data,src,callback){
	callback({
		items:[{
			name:'百度',
			url:'https://www.baidu.com/s?wd=%q&ie=utf-8',
		},{
			name:'搜狗',
			url:'http://www.sogou.com/sogou?query=%q',
		}],
		def:0,
	});
}*/

var /*ALL=0,*/ UNDEF=-1/*, TRASH=-2*/;
function collectionData(data){
	var col={
		id:data.id,
		title:data.title,
	};
	return col;
}
function getData(data,src,callback){
	data={
		cols:[
			{
				id:UNDEF,
				title:'默认频道',
				count:0,
			},
		],
		bm:[],
	};
	var h={},i;
	for(i of data.cols) h[i.id]=i;
	function getCollectionList(){
		var o=db.transaction('collections').objectStore('collections');
		o.index('pos').openCursor().onsuccess=function(e){
			var r=e.target.result,v;
			if(r) {
				v=r.value;
				if(v.id>0) {
					h[v.id]=v={
						id:v.id,
						title:v.title,
						count:0,
					};
					data.cols.push(v);
				}
				r.continue();
			} else getBookmarks();
		};
	}
	function getBookmarks(){
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
	getCollectionList();
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
		o.delete(id);
		callback();
	}
	function removeBookmarks(){
		var o=db.transaction('bookmarks','readwrite').objectStore('bookmarks');
		o.index('col').openCursor(id).onsuccess=function(e){
			var r=e.target.result;
			if(r) r.delete().onsuccess=function(e){
				r.continue();
			}; else removeCollection();
		};
	}
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
		pos:0,	// FIXME
	};
	if(data.id) col.id=data.id;
	var o=db.transaction('collections','readwrite').objectStore('collections');
	o.put(col).onsuccess=function(e){
		col.id=e.target.result;
		if(!data.id) col.count=0;
		callback(collectionData(col));
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
		callback(e.target.result);
	};
	return true;
}
function moveToCollection(data,src,callback){
	var o=db.transaction('bookmarks','readwrite').objectStore('bookmarks');
	o.get(data.id).onsuccess=function(e){
		var r=e.target.result;
		r.col=data.col||UNDEF;
		o.put(r).onsuccess=function(e){
			callback(r.id);
		};
	};
	return true;
}
function removeBookmarks(ids,src,callback){
	var removeOne=function(){
		var id=ids.shift();
		if(id) o.delete(id).onsuccess=removeOne;
		else callback();
	};
	var o=db.transaction('bookmarks','readwrite').objectStore('bookmarks');
	removeOne();
	return true;
}

function getSettings(key,def,callback){
	var o=db.transaction('settings').objectStore('settings');
	var r=o.get(key);
	r.onsuccess=function(e){
		var v=e.target.result;
		callback(v.data);
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
			callback(user=data);
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
			saveBookmark({title:item.title,url:item.url,col:col.id},null,function(){
				count++;
				cb();
			});
		}
		col=col||{id:0};
		if(col.getCol) col.getCol(function(data){
			delete col.getCol;
			col.id=data.id;
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
			body:'从Chrome导入'+count+'个书签！',
			icon:chrome.extension.getURL('images/icon128.png'),
		});
	}
	var count=0;
	chrome.bookmarks.getTree(function(arr){
		importNodes(arr,null,finish);
	});
	return true;
}

var db,user=null;
initDb(function(){
	chrome.runtime.onMessage.addListener(function(req,src,callback){
		var mappings={
			//GetSearchEngines:getSearchEngines,
			GetData:getData,
			//GetTags:getTags,
			GetBookmark:getBookmark,
			GetBookmarks:getBookmarks,
			SaveCollection:saveCollection,
			SaveBookmark:saveBookmark,
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
			if(/^(http|ftp)s?:/i.test(tab.url)) chrome.pageAction.show(tabId);
			else chrome.pageAction.hide(tabId);
		}
	});
});
