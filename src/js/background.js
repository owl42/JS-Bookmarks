function getSearchEngines(data,src,callback){
	callback([
		{
			name:'百度',
			url:'https://www.baidu.com/s?wd=%q&ie=utf-8',
		},{
			name:'搜狗',
			url:'http://www.sogou.com/sogou?query=%q',
		},
	]);
}

function getSpeedDials(data,src,callback){
	callback([
		[
			{
				name:'悟了个空',
				url:'http://geraldl.net',
				desc:'天下第一帅',
				bgcolor:'green',
			},{
				name:'咫尺天涯',
				url:'http://fboat.net',
				desc:'咫尺天涯',
				color:'dodgerblue',
				bgcolor:'yellow',
			}
		],
		[
			{
				name:'百度',
				url:'http://www.baidu.com',
				desc:'百度一下，你就知道',
				bgcolor:'blue',
			},{
				name:'Google',
				url:'http://www.google.com',
				desc:'谷歌知天下',
			}
		],
	]);
}

chrome.runtime.onMessage.addListener(function(req,src,callback){
	var mappings={
		GetSearchEngines:getSearchEngines,
		GetSpeedDials:getSpeedDials,
	},f=mappings[req.cmd];
	if(f) return f(req.data,src,callback);
});

chrome.tabs.onUpdated.addListener(function(tabId,changeInfo,tab){
	if(/^(https?|ftps?):/.test(tab.url)) {
		chrome.pageAction.show(tabId);
	}
});
