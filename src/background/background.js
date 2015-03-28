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

function getBookmarks(data,src,callback){
	var data=[{
		id:1,
		name:'悟了个空',
		url:'http://geraldl.net',
		desc:'天下第一帅',
		tags:['abc'],
		collection:'哥的书签',
	},{
		id:2,
		name:'咫尺天涯',
		url:'http://fboat.net',
		desc:'咫尺天涯',
		tags:['abc'],
		collection:'哥的书签',
	},{
		id:3,
		name:'百度',
		url:'http://www.baidu.com/',
		desc:'百度一下，你就知道',
		tags:['def'],
		collection:'常用书签',
	},{
		id:4,
		name:'Google',
		url:'http://www.google.com',
		desc:'谷歌知天下',
		tags:['ghi'],
		collection:'常用书签',
	}],data2=data;
	//for(var i=0;i<4;i++) data2.forEach(function(o){data.push(o);});
	callback(data)
}

chrome.runtime.onMessage.addListener(function(req,src,callback){
	var mappings={
		GetSearchEngines:getSearchEngines,
		GetBookmarks:getBookmarks,
	},f=mappings[req.cmd];
	if(f) return f(req.data,src,callback);
});

chrome.tabs.onUpdated.addListener(function(tabId,changeInfo,tab){
	if(/^(https?|ftps?):/.test(tab.url)) {
		//chrome.pageAction.show(tabId);
	}
});
