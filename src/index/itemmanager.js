define(function(require,exports,module) {
	var Slider=require('./slider');
	var id=0;

	function Item(data) {
		this.id=++id;
		this.data=data;
	}
	Item.prototype={
		getHtml:function(){
			var d=[],data=this.data;
			d.push('<div class=item draggable=true data-id='+this.id+' title='+JSON.stringify(data.desc)+'><div class=icon style="');
			if(data.color) d.push('color:'+data.color+';');
			if(data.bgcolor) d.push('background:'+data.bgcolor+';');
			d.push('">'+data.name+'</div><div class=desc>'+data.desc+'</div></div>');
			return d.join('');
		},
		click:function(){
			var data=this.data;
			if(data.url) window.open(data.url);
		},
	};

	function ItemManager(container){
		this.items={};
		this.init(container);
	}
	ItemManager.prototype={
		init:function(container){
			this.slider=new Slider(container);
			this.container=this.slider.j_pages;
			this.bindEvents();
		},
		loadData:function(pages){
			var self=this,m=[];
			pages.forEach(function(page){
				var p=document.createElement('div'),d=[];
				p.className='right page';
				page.forEach(function(data){
					var item=new Item(data);
					self.items[item.id]=item;
					d.push(item.getHtml());
				});
				p.innerHTML=d.join('');
				m.push(p);
			});
			self.slider.setData(m);
		},
		bindEvents:function(){
			var self=this;
			self.container.addEventListener('click',function(e){
				var t=e.target;
				while(!t.classList.contains('item')) {
					if(t===self.container) {
						t=null;
						return;
					}
					t=t.parentNode;
				}
				self.items[t.dataset.id].click();
			},false);
		},
	};

	module.exports=ItemManager;
});
