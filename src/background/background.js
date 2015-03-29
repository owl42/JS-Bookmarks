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

function getCollections(data,src,callback){
	data=[];
	collections.forEach(function(c){
		data.push({id:c.id,title:c.title,count:c.count});
	});
	callback(data);
}
function getTags(data,src,callback){
	data=[];
	tags.forEach(function(c){
		data.push({title:c.title,count:c.count});
	});
	callback(data);
}
function getBookmarks(data,src,callback){
	var col=d_collections[data];
	if(col) callback(col.children);
}

var collections=[{
	id:-1,
	title:'未分组书签',
},{
	id:0,
	title:'所有书签',
},{
	id:1,
	title:'哥的书签',
},{
	id:2,
	title:'常用书签',
}];
var d_collections={},tags=[];
!function(){
	var bookmarks=[{
		id:1,
		title:'悟了个空',
		url:'http://geraldl.net',
		desc:'天下第一帅',
		tags:['abc'],
		collection:1,
	},{
		id:2,
		title:'咫尺天涯',
		url:'http://fboat.net',
		desc:'咫尺天涯',
		tags:['abc'],
		collection:1,
	},{
		id:3,
		title:'百度',
		url:'http://www.baidu.com/',
		desc:'百度一下，你就知道',
		tags:['def'],
		collection:2,
	},{
		id:4,
		title:'Google',
		url:'http://www.google.com',
		desc:'谷歌知天下',
		tags:['ghi'],
		collection:2,
	}];
	//var data=bookmarks;for(var i=0;i<4;i++) data.forEach(function(o){bookmarks.push(o);});
	var htags={};
	collections.forEach(function(c){
		d_collections[c.id]=c;
		c.count=0;
		c.children=[];
	});
	bookmarks.forEach(function(b){
		var c=d_collections[b.collection||-1];
		c.count++;
		c.children.push(b);
		d_collections[0].count++;
		d_collections[0].children.push(b);
		b.tags.forEach(function(t){
			var ta=htags[t];
			if(!ta) {
				htags[t]=ta={title:t,count:0,children:[]};
				tags.push(ta);
			}
			ta.children.push(b);
			ta.count++;
		});
	});
}();
chrome.runtime.onMessage.addListener(function(req,src,callback){
	var mappings={
		GetSearchEngines:getSearchEngines,
		GetCollections:getCollections,
		GetTags:getTags,
		GetBookmarks:getBookmarks,
	},f=mappings[req.cmd];
	if(f) return f(req.data,src,callback);
});

chrome.tabs.onUpdated.addListener(function(tabId,changeInfo,tab){
	if(/^(https?|ftps?):/.test(tab.url)) {
		//chrome.pageAction.show(tabId);
	}
});
