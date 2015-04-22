function initDb(callback){
	var request=indexedDB.open('sunshine',2);
	request.onsuccess=function(e){db=request.result;if(callback) callback();};
	request.onerror=function(e){console.log('IndexedDB error: '+e.target.error.message);};
	request.onupgradeneeded=function(e){
		var r=e.currentTarget.result,o;
		if(e.oldVersion<1) {
			// collections: id title pos
			o=r.createObjectStore('collections',{keyPath:'id',autoIncrement:true});
			o.createIndex('pos','pos',{unique:false});	// should be unique at last
			// bookmarks: id title url col
			// deprecated: desc, tags
			o=r.createObjectStore('bookmarks',{keyPath:'id',autoIncrement:true});
			o.createIndex('col','col',{unique:false});
			// o.createIndex('tag','tags',{multiEntry:true});
		}
		if(e.oldVersion<2) {
			// settings: key data
			o=r.createObjectStore('settings',{keyPath:'key'});
		}
	};
}

function getSearchEngines(data,src,callback){
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
}

var ALL=0, UNDEF=-1, TRASH=-2;
function collectionData(data){
	var col={
		id:data.id,
		title:data.title,
	};
	if('count' in data) col.count=data.count||0;
	return col;
}
function getCollections(data,src,callback){
	data=[
		/*{
			id:TRASH,
			title:'垃圾桶',
			count:0,
		},*/{
			id:UNDEF,
			title:'默认频道',
			count: 0,
		}/*,{
			id:ALL,
			title:'全部频道',
			count: 0,
		}*/
	];
	var h={},i;
	for(i of data) h[i.id]=i;
	function getCollectionList(){
		var o=db.transaction('collections').objectStore('collections');
		o.index('pos').openCursor().onsuccess=function(e){
			var r=e.target.result,v;
			if(r) {
				v=r.value;
				if(v.id>0) {
					v.count=0;
					h[v.id]=v=collectionData(v);
					data.push(v);
				}
				r.continue();
			} else getCollectionData();
		};
	}
	function getCollectionData(){
		var o=db.transaction('bookmarks','readwrite').objectStore('bookmarks');
		o.index('col').openCursor().onsuccess=function(e){
			var r=e.target.result,v,c;
			if(r) {
				v=r.value;
				c=h[v.col];
				if(!v.col&&!c) {
					v.col=UNDEF;
					r.update(v);
					c=h[UNDEF];
				}
				c.count++;
				/*if(c.id!=TRASH)	// not trash
					h[ALL].count++;*/
				r.continue();
			} else callback(data);
		};
	}
	getCollectionList();
	return true;
}
function removeCollection(data,src,callback){
	/* data: {
	 *   id: id of collection to be removed
	 *   moveTo: id of collection to hold the bookmarks in this collection
	 * }
	 */
	function remove(){
		var o=db.transaction('collections','readwrite').objectStore('collections');
		o.delete(data.id);
		callback(moved);
	}
	function check(){
		var o=db.transaction('bookmarks','readwrite').objectStore('bookmarks');
		o.index('col').openCursor(data.id).onsuccess=function(e){
			var r=e.target.result;
			if(r) {
				var v=r.value;
				v.col=data.moveTo;
				r.update(v);
				moved++;
				r.continue();
			} else remove();
		};
	}
	var moved=0;
	data.moveTo=data.moveTo||TRASH;
	check();
	return true;
}
/*function getTags(data,src,callback){
	data={};
	var o=db.transaction('bookmarks').objectStore('bookmarks');
	o.index('tag').openCursor().onsuccess=function(e){
		var r=e.target.result,t;
		if(r) {
			data[r.key]=(data[r.key]||0)+1;
			r.continue();
		} else callback(data);
	};
	return true;
}*/
function getBookmarks(data,src,callback){
	var bm=[],o=db.transaction('bookmarks').objectStore('bookmarks');
	if(!data) data=IDBKeyRange.lowerBound(-1);
	o.index('col').openCursor(data).onsuccess=function(e){
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
	else col.count=0;
	var o=db.transaction('collections','readwrite').objectStore('collections');
	o.put(col).onsuccess=function(e){
		col.id=e.target.result;
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
function removeBookmark(data,src,callback){
	var o=db.transaction('bookmarks','readwrite').objectStore('bookmarks');
	o.delete(data).onsuccess=function(e){
		callback(data);
	};
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

var db,user=null;
initDb(function(){
	chrome.runtime.onMessage.addListener(function(req,src,callback){
		var mappings={
			GetSearchEngines:getSearchEngines,
			GetCollections:getCollections,
			//GetTags:getTags,
			GetBookmarks:getBookmarks,
			SaveCollection:saveCollection,
			SaveBookmark:saveBookmark,
			MoveToCollection:moveToCollection,
			RemoveBookmark:removeBookmark,
			RemoveCollection:removeCollection,
			GetUserInfo:getUserInfo,
			LogIn:logIn,
			LogOut:logOut,
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
