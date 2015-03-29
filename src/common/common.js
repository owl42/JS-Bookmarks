function getCollections(data,cb){
	data.colAll={};
	data.colUnd={};
	data.cols=[];
	data.d_cols={};
	chrome.runtime.sendMessage({cmd:'GetCollections'},function(cols){
		cols.forEach(function(c){
			data.d_cols[c.id]=c;
			if(c.id==-1) // 未分组
				data.colUnd=c;
			else if(c.id==0) // 所有
				data.colAll=c;
			else
				data.cols.push(c);
		});
		cb();
	});
}
