define(function(require,exports,module) {
	function Tab(label,sec) {
		this.label=label;
		this.sec=sec;
		this.id=sec.id;
	}
	Tab.prototype={
		hide:function(){
			this.label.classList.remove('active');
			this.sec.classList.remove('active');
		},
		show:function(){
			this.label.classList.add('active');
			this.sec.classList.add('active');
		},
	};

	function TabManager() {
		this.cur=null;
		this.tabs={};
	}
	TabManager.prototype={
		init:function(container,events){
			var self=this;
			self.container=container;
			self.header=container.querySelector('.header');
			var labels=self.header.querySelectorAll('label');
			Array.prototype.forEach.call(
				labels,
				function(l){
					var tab=new Tab(l,container.querySelector('#'+l.dataset.id));
					self.tabs[tab.id]=tab;
				}
			);
			self.bindEvents(events);
			self.showTab(labels[0].dataset.id);
		},
		bindEvents:function(events){
			var self=this;
			self.header.addEventListener('click',function(e){
				var t=e.target,f;
				while(t.parentNode!=self.header) {
					if(t===self.header) return;
					t=t.parentNode;
				}
				if(t.dataset.id) {
					self.showTab(t.dataset.id);
				} else if(t.dataset.cmd) {
					f=events[t.dataset.cmd];
					if(f) f();
				}
			},false);
		},
		showTab:function(id){
			var tab=this.tabs[id];
			if(tab) {
				if(this.cur) this.cur.hide();
				tab.show();
				this.cur=tab;
			}
		},
	};

	module.exports=TabManager;
});
