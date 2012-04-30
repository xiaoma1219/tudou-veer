
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
	
	this.play_control = this.controller.get("play_control");
	this.play_control.src = "images/ks.png";
	
	this.play_time = this.controller.get("play_time");
	
	this.video_slider = new SliderBar("slider_bar");
		
	this.video_slider.drag_start = this.start_drag_slider.bind(this);
	this.video_slider.drag_stop = this.stop_drag_slider.bind(this);
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
	this.play  = this.play.bind(this);
	this.pause = this.pause.bind(this);
	this.toggle_control = this.toggle_control.bind(this);
	this.play_control_tap = this.play_control_tap.bind(this);
	this.updateTime = this.updateTime.bind(this);
	
	this.video_object.addEventListener('play', this.play);
	this.video_object.addEventListener('pause', this.pause);
	this.video_control.addEventListener(Mojo.Event.tap, this.video_slider.slider_show);
	this.video_object.addEventListener(Mojo.Event.tap, this.toggle_control);
	this.play_control.addEventListener(Mojo.Event.tap, this.play_control_tap);
	
	API.item_info_api(this.item,{
		success : this.init_player.bind(this)
	});
	
	this.toggle_control("show");
}

PlayerAssistant.prototype.init_player = function(data){

	if(!data)
		return false;
	if(typeof(data) === "string")
		data = Mojo.parseJSON(data);
	this.video_object.src = data["clear_url"];
	this.video_slider._max_value(data["totaltime"]);
	this.duration = data["totaltime"]/1000;
	this.controller.get("total_time").innerHTML = formatTime(this.duration);
	this.controller.get("title").innerHTML = data["title"];
	this.video_object.play();
	this.play_time_counter = window.setInterval(this.updateTime, 1000);	
}
PlayerAssistant.prototype.init_video_info = function(){
	//this.video_slider.max_value = data["totaltime"];
	/*
	if(this.duration)
	Mojo.Log.info("duration: " + this.video_object.duration);
	this.controller.get("total_time").innerHTML = formatTime(this.video_object.duration);
	*/
}

PlayerAssistant.prototype.start_drag_slider = function(){
	this.pause();
}
PlayerAssistant.prototype.stop_drag_slider = function(time){
	//Mojo.Log.info(time);
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

PlayerAssistant.prototype.play = function(){
	this.play_control.src = "images/zt.png";
	this.play_status = "play";
}

PlayerAssistant.prototype.pause = function(){
	this.play_control.src = "images/ks.png";
	this.play_status = "pause";
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

PlayerAssistant.prototype.toggle_control = function(option){
	if(typeof(option) === "string"){
		
		if(this.hide_control_timeout){
			window.clearTimeout(this.hide_control_timeout);
		}
		if(option == "hide"){
			this.video_control.style.display = "none";
		}
		else{
			this.video_control.style.display = "";
			this.hide_control_timeout = window.setTimeout(this.toggle_control.curry("hide").bind(this),5000);
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

PlayerAssistant.prototype.setFitMode =  function(option){
	if (this.videoExt){
		this.videoExt.setFitMode(option);
	}
}

PlayerAssistant.prototype.activate = function(event) {
	this.toggle_control("show");
}	
	
PlayerAssistant.prototype.deactivate = function(event) {
	this.video_object.pause();
}

PlayerAssistant.prototype.cleanup = function(event) {
	if(this.play_time_counter)
		window.clearInterval(this.play_time_counter);
	this.video_object.removeEventListener('play', this.play);
	this.video_object.removeEventListener('pause', this.pause);	
	this.video_control.removeEventListener(Mojo.Event.tap, this.video_slider.slider_show);
	this.video_object.removeEventListener(Mojo.Event.tap, this.toggle_control);
	this.play_control.removeEventListener(Mojo.Event.tap, this.play_control_tap);
}