
PlayerAssistant = Class.create({
	initialize: function(item){
		this.item = item;
	}
});

/*
var PowerManagerService = function(){};

PowerManagerService.prototype = {
	registerForEvents: function(controller, callback) {
		return controller.serviceRequest(
			'palm://com.palm.display', {
				method: 'status',
				onSuccess: callback,
				parameters: {subscribe: true}
			}
		);
	},
	
	markAppForeground: function(controller, callback) {
		return controller.serviceRequest(
			"palm://com.palm.audio/media", {
				method: 'lockVolumeKeys',
				onSuccess: callback,
				parameters: {
					subscribe: true,
					foregroundApp: true
				}
			}
		);
	}
};

PlayerAssistant.prototype._powerServiceCallback = function(event){
	if (!this.playEngine){ return; }
	if (event.event === "displayOff"){
		//this.playEngine.setBlockPlayEvents(true);
		Mojo.Log.error ("display is off, sending pause");
		this.pause();
	} else if (event.event === "displayOn" && this.controller.stageController.active){
		//this tells the videoplayer to continue blocking play events if autoplay is set to false
		//this.playEngine.setBlockPlayEvents(!this.autoplay);
		Mojo.Log.error ("display is on, sending autoplay");
	}
}
*/

PlayerAssistant.prototype.setup = function() {
	this.video_object = this.controller.get("video-object");
	this.player = this.controller.get("player");
	this.video_control = this.controller.get("video-control");
	this.slider_bar_container = this.controller.get("slider_bar_container");
	this.play_control = this.controller.get("play_control");
	this.play_control.src = "images/ks.png";
	
	this.play_time = this.controller.get("play_time");
	this.fit_button = this.controller.get("fit_button");
	this.header_bar = this.controller.get("header_bar");
	this.detail_button = this.controller.get("detail_button");
	this.detail_layout = this.controller.get("detail_layout");
	this.video_slider = new SliderBar("slider_bar");
		

	/*
	this.powerService = new PowerManagerService();
	this.powerService.registerForEvents(this.controller, this._powerServiceCallback.bind(this));
	this.powerService.markAppForeground(this.controller);
	*/
	
	if (mediaextension){
		this.videoExt = mediaextension.MediaExtension.getInstance(this.video_object, this);
		this.videoExt.audioClass = 'media';
	}
	this.setFitMode("fit");
	//this.setFitMode("fill");
	
	this.video_slider.drag_start = this.start_drag_slider.bind(this);
	this.video_slider.drag_stop = this.stop_drag_slider.bind(this);
	this.play  = this.play.bind(this);
	this.pause = this.pause.bind(this);
	this.toggle_control = this.toggle_control.bind(this);
	this.play_control_tap = this.play_control_tap.bind(this);
	this.updateTime = this.updateTime.bind(this);
	this.ended = this.ended.bind(this);
	this.loadedmetadata = this.loadedmetadata.bind(this);
	this.fit_button_active = this.fit_button_active.bind(this);
	this.fit_button_deactive = this.fit_button_deactive.bind(this);
	this.toggle_detail = this.toggle_detail.bind(this);
	
	this.show_control = this.toggle_control.curry("show").bind(this);
	
	this.video_object.addEventListener('loadedmetadata', this.loadedmetadata);
	this.video_object.addEventListener('play', this.play);
	this.video_object.addEventListener('pause', this.pause);
	this.video_object.addEventListener('ended', this.ended);
	
	this.slider_bar_container.addEventListener("click", this.video_slider.slider_show, true);
	this.video_object.addEventListener("click", this.toggle_control, true);
	this.play_control.addEventListener("click", this.play_control_tap);
	
	this.fit_button.addEventListener("mousedown", this.fit_button_active);
	this.fit_button.addEventListener("mouseup", this.fit_button_deactive);
	
	this.detail_button.addEventListener(Mojo.Event.tap, this.toggle_detail);
	
	this.video_control.addEventListener(Mojo.Event.tap, this.show_control);
	this.header_bar.addEventListener(Mojo.Event.tap, this.show_control);
	this.detail_layout.addEventListener(Mojo.Event.tap, this.show_control);
	
	API.item_info_api(this.item,{
		success : this.init_player.bind(this)
	});
	
	this.show_control();
}

PlayerAssistant.prototype.init_player = function(data){

	if(!data)
		return false;
	if(typeof(data) === "string")
		data = Mojo.parseJSON(data);
	this.video_object.src = data["clear_url"];
	this.video_slider._max_value(data["totaltime"]);
	this.duration = data["totaltime"]/1000;
	this.item_id = data["itemid"];
	var total_time = formatTime(this.duration);
	this.controller.get("total_time").innerHTML = total_time;
	this.controller.get("title").innerHTML = "正在播放: " + data["title"];
		
	//init_detail
	this.detail_layout.innerHTML = "title: " + data["title"] + 
							"<br />长度: " + total_time+ 
							"<br />描述: " + data["description"] + 
							"<br />博客: " + data["podcast"] + 
							"<br />标签: " + data["tags"];
	
	this.video_object.play();
	this.play_time_counter = window.setInterval(this.updateTime, 1000);	
}
PlayerAssistant.prototype.init_played_time = function(){
	this.controller.get("time_container").style.display = "block";
	if(document.cookie.length < 0)
		return false;
	var i_start = document.cookie.indexOf("played_time_" + this.item_id + "=");
	if(i_start == -1)
		return false;
	var i_end = document.cookie.indexOf(";",i_start);
	if(i_end == -1)
		i_end = document.cookie.length;
	var time = document.cookie.substring(i_start + 13 + this.item_id.length, i_end);
	this.play_timed_cookie = true;
	this.video_object.currentTime = parseFloat(time);
	
}

PlayerAssistant.prototype.start_drag_slider = function(){
	this.pause();
}
PlayerAssistant.prototype.stop_drag_slider = function(time){
	this.video_object.currentTime = time;
	this.play();
}

PlayerAssistant.prototype.play_control_tap = function(){
	if(this.play_status == "play"){
		this.video_object.pause();
	}
	else{
		this.video_object.play();
	}
}
PlayerAssistant.prototype.loadedmetadata = function(){
	this.init_played_time();
}
PlayerAssistant.prototype.play = function(){
	this.play_control.src = "images/zt.png";
	this.play_status = "play";
	this.play_ended = false;
}

PlayerAssistant.prototype.pause = function(){
	this.play_control.src = "images/ks.png";
	this.play_status = "pause";
}

PlayerAssistant.prototype.ended = function(){
	this.play_ended = true;
}

PlayerAssistant.prototype.updateTime = function(){
	var buffered = this.video_object.buffered;
	
	if(buffered.length != 0) {
		buffered = buffered.end(0);
	} else {
		buffered = 0;
	}
	this.video_slider._value(this.video_object.currentTime*1000, buffered*1000 );
	this.play_time.innerHTML = formatTime(this.video_object.currentTime);
}

PlayerAssistant.prototype.toggle_detail = function(option){
	Mojo.Log.info(option);
	if(typeof(option) === "string"){
		if(this.hide_control_timeout){
		}
		if(option == "hide"){
			this.detail_layout.style.display = "none";
		}
		else{
			this.detail_layout.style.display = "block";
		}
		return true;
	}
	if(this.detail_layout.style.display == "none"){
		this.toggle_detail("show");
	}
	else{
		this.toggle_detail("hide");
	}
}

PlayerAssistant.prototype.toggle_control = function(option){
	if(typeof(option) === "string"){
		if(this.hide_control_timeout){
			clearTimeout(this.hide_control_timeout);
		}
		if(option == "hide"){
			this.video_control.style.display = "none";
			this.header_bar.style.display = "none";
			this.detail_layout.style.display = "none";
		}
		else{
			this.video_control.style.display = "";
			this.header_bar.style.display = "";
			this.hide_control_timeout = setTimeout(this.toggle_control.curry("hide").bind(this),5000);
		}
		return true;
	}
	if(this.video_control.style.display == "none"){
		this.toggle_control("show");
	}
	else{
		this.toggle_control("hide");
	}
}

PlayerAssistant.prototype.fit_button_active = function(){
	if(this.fitMode == "fit"){
		this.fit_button.style.backgroundPosition = "bottom right";
	}
	else{
		this.fit_button.style.backgroundPosition = "bottom left";
	}
}
PlayerAssistant.prototype.fit_button_deactive = function(){
	if(this.fitMode == "fit"){
		this.fit_button.style.backgroundPosition = "top left";
		this.setFitMode("fill");
	}
	else{
		this.fit_button.style.backgroundPosition = "top right";
		this.setFitMode("fit");
	}
}

PlayerAssistant.prototype.setFitMode =  function(option){
	if (this.videoExt){
		this.fitMode = option;
		this.videoExt.setFitMode(option);
	}
}

PlayerAssistant.prototype.activate = function(event) {
}	
	
PlayerAssistant.prototype.deactivate = function(event) {
}

PlayerAssistant.prototype.cleanup = function(event) {
	if(this.play_time_counter)
		clearInterval(this.play_time_counter);
	
	if(!this.play_ended && this.video_object.currentTime > 0){
		document.cookie = "played_time_" + this.item_id + "=" + this.video_object.currentTime;
	}
	else{
		if(this.play_timed_cookie){
			var exp = new Date();
			exp.setTime (exp.getTime() - 1);
			document.cookie = "played_time_" + this.item_id + "=0; expires=" + exp.toGMTString();
			}
	}	
	
	this.video_object.removeEventListener('play', this.play);
	this.video_object.removeEventListener('pause', this.pause);	
	this.video_object.removeEventListener('ended', this.ended);
	this.video_object.removeEventListener('loadedmetadata', this.loadedmetadata);
	
	this.slider_bar_container.removeEventListener("click", this.video_slider.slider_show, true);
	this.video_object.removeEventListener("click", this.toggle_control);
	this.play_control.removeEventListener("click", this.play_control_tap);
	
	this.fit_button.removeEventListener("mousedown", this.fit_button_active);
	this.fit_button.removeEventListener("mouseup", this.fit_button_deactive);
	
	this.detail_button.removeEventListener(Mojo.Event.tap, this.toggle_detail);
	this.video_control.removeEventListener(Mojo.Event.tap, this.show_control);
	this.header_bar.removeEventListener(Mojo.Event.tap, this.show_control);
	this.detail_layout.removeEventListener(Mojo.Event.tap, this.show_control);
}