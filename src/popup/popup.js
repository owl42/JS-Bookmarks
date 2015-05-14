var _ = chrome.i18n.getMessage;

function safeHTML(s){
	return s.replace(/[&<]/g,function(m){
		return {
			'&':'&amp;',
			'<':'&lt;',
		}[m];
	});
}
function saveBookmark(){
	if(bookmark.url) {
		bookmark.updateStar=true;
		chrome.runtime.sendMessage({cmd:'SaveBookmark',data:bookmark},function(id){
			bookmark.id=id;
		});
	}
}
function updateBookmark(){
	var i;
	$('.title').innerHTML=safeHTML(bookmark.title);
	if(collections.length)
	for(i=0;i<collections.length;i++){
		var cls=n_cols[i].classList;
		if(bookmark.col===collections[i].id) {
			cls.add('active');
			cur_col=i;
		} else cls.remove('active');
	}
}
function checkBookmark(){
	if(bookmark.url)
	chrome.runtime.sendMessage({cmd:'GetBookmark',data:bookmark.url},function(data){
		if(data) {
			bookmark=data;
			updateBookmark();
		} else saveBookmark();
	});
}
function getTabData(){
	chrome.tabs.query({active:true},function(tabs){
		var tab=tabs[0];
		bookmark.title=tab.title;
		bookmark.url=tab.url;
		updateBookmark();
		checkBookmark();
	});
}
function getCollections(){
	chrome.runtime.sendMessage({cmd:'GetCollections'},function(cols){
		collections=cols;
		j_cols.innerHTML='';
		var html=[];
		cols.forEach(function(col){
			html.push('<div class="collection row">'+safeHTML(col.title)+'</div>');
		});
		j_cols.innerHTML=html.join('');
		n_cols=j_cols.querySelectorAll('.collection');
		updateBookmark();
	});
}
function bindEvents(){
	j_cols.parentNode.addEventListener('click',function(e){
		j_cols.classList.toggle('select');
		var i=Array.prototype.indexOf.call(n_cols,e.target);
		if(i>=0&&cur_col!=i) {
			n_cols[cur_col].classList.remove('active');
			n_cols[cur_col=i].classList.add('active');
			bookmark.col=collections[i].id;
			saveBookmark();
		}
	},false);
	$('.show-all').addEventListener('click',function(e){
		var url=chrome.extension.getURL('/options/options.html');
		/*chrome.tabs.query({currentWindow:true,url:url},function(tabs) {
			if(tabs[0]) chrome.tabs.update(tabs[0].id,{active:true});
			else*/ chrome.tabs.create({url:url});
		//});
	},false);
}
var bookmark={
	col:-1,
};
var $=document.querySelector.bind(document);
var collections=[],j_cols=$('.collections>.wrap'),cur_col=0,n_cols;
bindEvents();
getCollections();
getTabData();
Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function(node) {
	node.innerHTML = _(node.dataset.i18n);
});
