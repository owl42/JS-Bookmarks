define(function(require,exports,module){
	function Slider(container){
		this.pagin=[];
		this.cur=-1;
		this.init(container);
	}
	Slider.prototype={
		init:function(container){
			this.container=container;
			container.innerHTML='<div class=pages></div><div class=pagin></div>';
			this.j_pages=container.querySelector('.pages');
			this.j_pagin=container.querySelector('.pagin');
			this.bindEvents();
		},
		bindEvents:function(){
			var self=this;
			self.j_pages.addEventListener('mousewheel',function(e){
				if(e.wheelDelta<0) self.loadPage((self.cur+1)%self.pagin.length);
				else self.loadPage((self.cur+self.pagin.length-1)%self.pagin.length);
			},false);
			self.j_pagin.addEventListener('click',function(e){
				var t=e.target,i=Array.prototype.indexOf.call(self.pagin,t);
				if(i>=0) self.loadPage(i);
			},false);
		},
		setData:function(pages){
			var m=[],self=this;
			self.pages=pages.concat();
			self.pages.forEach(function(page){
				self.j_pages.appendChild(page);
				m.push('<span></span>');
			});
			self.j_pagin.innerHTML=m.join('');
			self.pagin=self.j_pagin.querySelectorAll('span');
			self.loadPage(0);
		},
		loadPage:function(p){
			if(p<0) p=0;
			else if(p>=this.pagin.length) p=this.pagin.length-1;
			if(this.cur>=0&&this.cur<this.pagin.length)
				this.pagin[this.cur].classList.remove('active');
			if(this.cur<0) {
			} else if(this.cur<p)
				for(;this.cur<p;this.cur++)
					this.pages[this.cur].className='left page';
			else if(this.cur>p)
				for(;this.cur>p;this.cur--)
					this.pages[this.cur].className='right page';
			this.pages[this.cur=p].className='page';
			this.pagin[this.cur].classList.add('active');
		},
	};

	module.exports=Slider;
});
