define(function(require,exports,module) {
	var $=document.querySelector.bind(document);
	var SearchEngine=require('./searchengine');
	var ItemManager=require('./itemmanager');
	var TabManager=require('./tabmanager');

	var search=new SearchEngine($('.searchbox'));
	chrome.runtime.sendMessage(
		{cmd:'GetSearchEngines'},search.loadData.bind(search));

	var items=new ItemManager($('.items'));
	chrome.runtime.sendMessage(
		{cmd:'GetSpeedDials'},items.loadData.bind(items));

	function toggleSettings(){
		$('.right.side').classList.toggle('active');
	}

	var tabs=new TabManager();
	tabs.init($('.tabs'),{
		close:toggleSettings,
	});

	$('.menu.settings').addEventListener('click',function(e){
		e.preventDefault();
		toggleSettings();
	},false);
});
