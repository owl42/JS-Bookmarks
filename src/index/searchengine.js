define(function(require,exports,module) {
	function SearchEngine(container){
		this.cur=-1;
		this.init(container);
	}
	SearchEngine.prototype={
		init:function(container){
			this.container=container;
			container.innerHTML=
				'<form>'+
					'<input type="search" class=search required>'+
					'<label class="engine"></label>'+
					'<div class="submit"><i class="fa fa-arrow-right"></i></div>'+
					'<div class="engines"></div>'+
					'<input type=submit>'+
				'</form>';
			this.form=container.querySelector('form');
			this.j_engine=container.querySelector('.engine');
			this.j_engines=container.querySelector('.engines');
			this.j_search=container.querySelector('.search');
			this.j_submit=container.querySelector('input[type=submit]');
			this._hideEngines=this.hideEngines.bind(this);
			this.bindEvents();
		},
		hideEngines:function(){
			this.j_engines.style.display='';
			document.removeEventListener('click',this._hideEngines,false);
		},
		updateEngine:function(cur){
			if(cur<0) cur=0;
			else if(cur>this.engines.length) cur=this.engines.length-1;
			this.j_engine.innerHTML=this.engines[this.cur=cur].name;
		},
		bindEvents:function(){
			var self=this;
			self.j_engine.addEventListener('click',function(e){
				e.stopPropagation();
				var eng=[];
				self.engines.forEach(function(o,i){
					eng.push('<div class="option" data='+JSON.stringify(i)+'>'+o.name+'</div>');
				});
				self.j_engines.innerHTML=eng.join('');
				self.j_engines.style.display='block';
				document.addEventListener('click',self._hideEngines,false);
			},false);
			self.j_engines.addEventListener('click',function(e){
				var t=e.target;
				self.updateEngine(t.getAttribute('data'));
			},false);
			self.form.addEventListener('submit',function(e){
				e.preventDefault();
				var v=self.j_search.value;
				if(v) {
					window.open(self.engines[self.cur].url.replace('%q',v));
					self.j_search.select();
				}
			},false);
			self.form.querySelector('.submit').addEventListener('click',function(e){
				e=document.createEvent('HTMLEvents');
				e.initEvent('click',false,true);
				self.j_submit.dispatchEvent(e);
			},false);
		},
		loadData:function(engines,cur){
			this.engines=engines;
			this.updateEngine(cur||0);
		},
	};
	module.exports=SearchEngine;
});
