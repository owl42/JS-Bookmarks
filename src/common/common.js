function getCollections(data,cb){
	data.colAll={};
	data.colUnd={};
	data.cols=[];
	data.d_cols={};
	chrome.runtime.sendMessage({cmd:'GetCollections'},function(cols){
		cols.forEach(function(col){
			if(col.id==-1) // 未分组
				data.colUnd=col;
			else if(col.id==0) // 所有
				data.colAll=col;
			else
				data.cols.push(col);
			data.d_cols[col.id]=col;
		});
		cb();
	});
}
function saveBookmark(olditem,item,root,cb){
	chrome.runtime.sendMessage({cmd:'SaveBookmark',data:item},function(item){
		if(olditem.id) {
			if(olditem.col!=item.col) {
				root.d_cols[olditem.col].count--;
				root.d_cols[item.col].count++;
			}
		} else {
			root.colAll.count++;
			root.d_cols[item.col].count++;
		}
		cb(item);
	});
}
function removeBookmark(item,root,cb){
	chrome.runtime.sendMessage({cmd:'RemoveBookmark',data:item.id},function(){
		var i=root.bookmarks.indexOf(item);
		root.bookmarks.splice(i,1);
		delete root.d_bookmarks[item.id];
		root.colAll.count--;
		root.d_cols[item.col].count--;
		cb();
	});
}
