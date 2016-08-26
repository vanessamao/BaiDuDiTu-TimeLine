function addEvent(dom, type, fn) {
	//对于支持DOM2级事件处理程序addeventListener方法的浏览器
	if (dom.addEventListener) {
		dom.addEventListener(type, fn, false);
	} else if (dom.attachEvent) {
		//对于不支持addEventListener方法但支持attchEvent方法的浏览器	
		dom.attachEvent('on' + type, fn);
	} else {
		//对于不支持以上两种,但支持on+'事件名'的浏览器
		dom['on' + type] = fn;
	}
}

var TimerLine = {
	data: {
		containerDiv: 'timerline', //容器盒子id
		datesDiv:'dates',//日期盒子id
		btnsDiv:'timerlineBtns',
		btns: {
			play: "timerbtn-play",
			stop: "timerbtn-stop",
			pre:"timerbtn-pre",
			next:"timerbtn-next"
		},
		processDiv:'processbar',	//进度条div
	},
	protect:{
		lock_play:false,
		lock_stop:false,
		index_label:1,
		index_process:0
	},
	rubbish_datas: [], //用来存储ajax获取到的数据
	index: 0, //变化的index
	Interval_label: null,
	Interval_process:null,
	map: new BMap.Map("allmap", {
		minZoom: 14,
		maxZoom: 20
	}),
	Utils: {
		//编写自定义函数,创建标注
		addMarker: function(point, label, status) {
			//		var marker = new BMap.Marker(point);
			var myIcon = new BMap.Icon("images/rubbish_" + status + ".png", new BMap.Size(32, 32), {
				anchor: new BMap.Size(16, 32), //中心点设置
				infoWindowAnchor: new BMap.Size(16, 4) //消息框位置5
			});
			var marker = new BMap.Marker(point, {
				icon: myIcon
			});
			TimerLine.map.addOverlay(marker);
			//跳动的动画
			//				marker.setAnimation(BMAP_ANIMATION_BOUNCE);
			marker.setAnimation(BMAP_ANIMATION_DROP);
			var p = marker.getPosition();
			var content = "<table>";
			content = content + "<tr><td> 编号：" + label.content + "</td></tr>";
			content = content + "<tr><td> 坐标：" + p.lng + "," + p.lat + "</td></tr>";
			content = content + "<tr><td> 状态：" + status + "</td></tr>";
			content += "</table>";
			var infowindow = new BMap.InfoWindow(content);
			//添加绑定事件
			addEvent(marker, 'click', getAttr);
			function getAttr() {
				this.openInfoWindow(infowindow);
			}
		},
		/**
		 * 地图标注方法
		 * 参数:		datas:标注物数组{date:"",info:{}}
		 * 			index:序数(日期)
		 * */
		mapSetLabel: function(datas, n,isInterval) {
			TimerLine.map.clearOverlays();
			var index;
			console.log(TimerLine.protect.index_label);
			if(isInterval){
				TimerLine.protect.index_label++;
				if (TimerLine.protect.index_label >= TimerLine.rubbish_datas.length - 1) {
					TimerLine.protect.index_label = TimerLine.rubbish_datas.length - 1;
					clearInterval(TimerLine.Interval_label);
					TimerLine.protect.lock_play=false;
				}
			}
			
			if (n == null) {
				if(TimerLine.protect.index_label==0){
					TimerLine.protect.index_label=1
				}
				index = TimerLine.protect.index_label;
			} else {
				index = parseInt(n);
				TimerLine.protect.index_label = index;
			}
			
			var info = datas[index].info;
			var info_count=0;
			var addMarker_Interval=setInterval(function(){
				var p = info[info_count].point.split(',');
				var p_x = parseFloat(p[0].toString()); //纬度
				var p_y = parseFloat(p[1].toString()); //经度
				//创建label标签
				var label = new BMap.Label(info[info_count].title, {
					offset: new BMap.Size(20, -10)
				});
				//创建标注点
				var point = new BMap.Point(p_x, p_y);
				//状态(垃圾箱状态)
				var status = info[info_count].status;			
				//添加标注的方法
				TimerLine.Utils.addMarker(point, label, status);
				info_count++;
				if(info_count>=info.length){
					clearInterval(addMarker_Interval);
				}
			},0);

		},
		//添加日期点击事件绑定 dates li click
		bindEvent: function() {
			var datesDiv = document.getElementById("dates");
			addEvent(datesDiv,'click',function(e){
				var event = e || window.e;
				var target = event.target || event.srcElement;
				for(var i=0;i<TimerLine.rubbish_datas.length;i++){
					if(target.innerText==TimerLine.rubbish_datas[i].date){
//		
						TimerLine.protect.index_process=i;
						TimerLine.protect.index_label=i;
						//播放解锁
						if(TimerLine.protect.lock_play)	TimerLine.protect.lock_play=false;
						TimerLine.Utils.mapSetLabel(TimerLine.rubbish_datas, i,false);
						TimerLine.Utils.Setprocess(i,false);
						return ;
					}
				}
			})
		},
		//进度条滚动
		Setprocess:function(index,isInterval){
			if(isInterval){
				TimerLine.protect.index_process++;
				console.log(TimerLine.protect.index_process);
				console.log(TimerLine.rubbish_datas.length);
				if(TimerLine.protect.index_process >= TimerLine.rubbish_datas.length-1){
					TimerLine.protect.index_process = TimerLine.rubbish_datas.length-1;
					clearInterval(TimerLine.Interval_process);
					TimerLine.protect.lock_play=false;
				}
			}
			var datesDiv = document.getElementById("dates");
			var processDiv = document.getElementById(TimerLine.data.processDiv);
			if(index==null){
				processDiv.style.width =parseInt(processDiv.style.width)+datesDiv.getElementsByTagName('li')[0].offsetWidth+'px';
			}else{
				processDiv.style.width =datesDiv.getElementsByTagName('li')[0].offsetWidth*parseInt(index+1)+'px';
			}
			
		}
		
	},
	//TimerLine初始化
	init: function() {
		this.createMap();
		this.ajaxCreate();
		//事件绑定
		this.bindEvent();
	},
	createMap: function() {
		// 创建Map实例,设置地图允许的最小/大级别
		var map = this.map;
		map.centerAndZoom(new BMap.Point(121.365593, 37.528502), 15); // 初始化地图,用城市名设置地图中心点
		//map.enableScrollWheelZoom(true); //启用滚轮放大缩小
	},
	ajaxCreate: function() {
		var That = this;
		var containerDiv = That.data.containerDiv;
		$.ajax({
			type: "get",
			url: "js/json.json",
			dataType: 'json',
			success: function(data) {
				containerDiv = document.getElementById(containerDiv); //容器id
				That.rubbish_datas = data.result.datas; //
				//console.log(That.rubbish_datas);
				That.create(containerDiv, That.rubbish_datas);
				//日期时间绑定
				That.Utils.bindEvent();
			}
		});
	},
	create: function(containerDiv, datas) {
		var That = this;
		var datasDiv ='<div class="processcontainer"><div id="processbar" style="width:120px;"></div></div>';
//		var datasDiv = '<ul id="dates" class="timerlineul dates clearfix">';
		datasDiv += '<ul id="dates" class="timerlineul dates clearfix">';
		for (var i = 0; i < datas.length; i++) {
			datasDiv += '<li>' + datas[i].date + '</li>';
		}
		datasDiv += '</ul>';	
		document.getElementById(That.data.btnsDiv).innerHTML='<div class="timerline-btns clearfix"><div id="timerbtn-pre" class="iconfont icon-shangyishou"></div><div id="timerbtn-play" class="iconfont icon-zanting"></div><div id="timerbtn-next" class="iconfont icon-xiayishou"></div></div>'
		//创建第一天的标注
		this.Utils.mapSetLabel(datas, 0,false);
		
//		console.log(TimerLine.index);
		That.datas = datas;
		containerDiv.innerHTML = datasDiv;
	},
	//播放 暂停 委托事件----时间绑定
	bindEvent: function() {
		if (this.data.btns == null)
			return;
		var That = this;
		addEvent(document.getElementById(That.data.btnsDiv), 'click', function(e) {
			var event = e || window.e;
			var target = event.target || event.srcElement;
			//播放事件
			if (target.id == That.data.btns.play) {
				if(!TimerLine.protect.lock_play){
					if(TimerLine.protect.index_label >= TimerLine.rubbish_datas.length-1){
						TimerLine.protect.index_label=0;
						var processDiv = document.getElementById(TimerLine.data.processDiv);
						var datesDiv = document.getElementById("dates");
						processDiv.style.width = datesDiv.getElementsByTagName('li')[0].offsetWidth+'px';
					}
					if(TimerLine.protect.index_process >= TimerLine.rubbish_datas.length-1){
						TimerLine.protect.index_process=0;
					}
//				
					TimerLine.Interval_label = setInterval("TimerLine.Utils.mapSetLabel(TimerLine.rubbish_datas,null,true)", 1000);
					TimerLine.Interval_process = setInterval("TimerLine.Utils.Setprocess(null,true)",1000);	
					$("#timerbtn-play").attr("class","iconfont icon-zanting1");
					//播放枷锁
					TimerLine.protect.lock_play=true;
					//暂停解锁
					TimerLine.protect.lock_stop=false;
				}else if(TimerLine.protect.lock_play){
					$("#timerbtn-play").attr("class","iconfont icon-zanting");
					TimerLine.Interval_label&&clearInterval(TimerLine.Interval_label);
					TimerLine.Interval_process&&clearInterval(TimerLine.Interval_process);
					//播放解锁
					TimerLine.protect.lock_play=false;
					//暂停加锁
					TimerLine.protect.lock_stop=true;
				}
			}
			
			if(target.id == That.data.btns.pre){
				if(TimerLine.protect.index_label==0) return;
				TimerLine.Utils.mapSetLabel(TimerLine.rubbish_datas, TimerLine.protect.index_label-1,false);
				TimerLine.Utils.Setprocess(TimerLine.protect.index_process-1,false);
				TimerLine.protect.index_process=TimerLine.protect.index_process-1;
			}
			if(target.id == That.data.btns.next){
				if(TimerLine.protect.index_label==TimerLine.rubbish_datas.length-1) return;
				TimerLine.Utils.mapSetLabel(TimerLine.rubbish_datas, TimerLine.protect.index_label+1,false);
				TimerLine.Utils.Setprocess(TimerLine.protect.index_process+1,false);
				TimerLine.protect.index_process=TimerLine.protect.index_process+1;
			}
		});
	}
}




TimerLine.init();