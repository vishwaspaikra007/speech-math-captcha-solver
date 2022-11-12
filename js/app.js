//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream; 						//stream from getUserMedia()
var rec; 							//Recorder.js object
var input; 							//MediaStreamAudioSourceNode we'll be recording
var array;
// shim for AudioContext when it's not avb. 
// if (! window.AudioContext) {
//     if (! window.webkitAudioContext) {
//         bad_browser();
//         return;
//     }
//     window.AudioContext = window.webkitAudioContext;
// }

// var ctx = new AudioContext();
// const audioCtx = new AudioContext({
// 	latencyHint: "interactive",
// 	sampleRate: 16000,
//   });

var AudioContext = window.AudioContext || window.webkitAudioContext;
// var AudioContext = audioCtx || window.webkitAudioContext;
// var AudioContext = audioCtx;

var audioContext //audio context to help us record

// var recordButton = document.getElementById("recordButton");
// var stopButton = document.getElementById("stopButton");
// var pauseButton = document.getElementById("pauseButton");

//add events to those 2 buttons
// recordButton.addEventListener("click", startRecording);
// stopButton.addEventListener("click", stopRecording);
// pauseButton.addEventListener("click", pauseRecording);

function startRecording() {
	console.log("recordButton clicked");

	/*
		Simple constraints object, for more advanced audio features see
		https://addpipe.com/blog/audio-constraints-getusermedia/
	*/
    
    var constraints = { audio: true, video:false }

 	/*
    	Disable the record button until we get a success or fail from getUserMedia() 
	*/

	recordButton.disabled = true;
	//stopButton.disabled = false;
	//pauseButton.disabled = false

	/*
    	We're using the standard promise based getUserMedia() 
    	https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
	*/

	navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
		console.log("getUserMedia() success, stream created, initializing Recorder.js ...");

		/*
			create an audio context after getUserMedia is called
			sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
			the sampleRate defaults to the one set in your OS for your playback device

		*/
		audioContext = new AudioContext({
			latencyHint: "interactive",
			sampleRate: 16000,
		});

		//update the format 
		document.getElementById("formats").innerHTML="Format: 1 channel pcm @ "+audioContext.sampleRate/1000+"kHz"

		/*  assign to gumStream for later use  */
		gumStream = stream;
		
		/* use the stream */
		input = audioContext.createMediaStreamSource(stream);

		/* 
			Create the Recorder object and configure to record mono sound (1 channel)
			Recording 2 channels  will double the file size
		*/
		rec = new Recorder(input,{numChannels:1})

		//start the recording process
		rec.record()

		console.log("Recording started");

		setTimeout(() => {
			stopRecording();
		}, 2000, stopRecording);

	}).catch(function(err) {
	  	//enable the record button if getUserMedia() fails
    	recordButton.disabled = false;
    	stopButton.disabled = true;
    	pauseButton.disabled = true
	});
}

function pauseRecording(){
	console.log("pauseButton clicked rec.recording=",rec.recording );
	if (rec.recording){
		//pause
		rec.stop();
		pauseButton.innerHTML="Resume";
	}else{
		//resume
		rec.record()
		pauseButton.innerHTML="Pause";

	}
}

function stopRecording() {
	console.log("stopButton clicked");

	//disable the stop button, enable the record too allow for new recordings
	//stopButton.disabled = true;
	recordButton.disabled = false;
	//pauseButton.disabled = true;

	//reset button just in case the recording is stopped while paused
	//pauseButton.innerHTML="Pause";
	
	//tell the recorder to stop the recording
	rec.stop();

	//stop microphone access
	gumStream.getAudioTracks()[0].stop();

	//create the wav blob and pass it on to createDownloadLink
	rec.exportWAV(createDownloadLink);
	
}

function createDownloadLink(blob) {

	var url = URL.createObjectURL(blob);
	var au = document.createElement('audio');
	var li = document.createElement('li');
	var link = document.createElement('a');

	//name of .wav file to use during upload and download (without extendion)
	var filename = new Date().toISOString();

	//add controls to the <audio> element
	au.controls = true;
	au.src = url;

	console.log(au);
	//save to disk link
	link.href = url;
	link.download = filename+".wav"; //download forces the browser to donwload the file using the  filename
	link.innerHTML = "Save to disk";

	//add the new audio element to li
	li.appendChild(au);
	
	//add the filename to the li
	li.appendChild(document.createTextNode(filename+".wav "))

	//add the save to disk link to li
	li.appendChild(link);
	
	//upload link
	var upload = document.createElement('a');
	upload.href="#";
	upload.innerHTML = "Upload";
	upload.addEventListener("click", function(event){
		  var xhr=new XMLHttpRequest();
		  xhr.onload=function(e) {
		      if(this.readyState === 4) {
		          console.log("Server returned: ",e.target.responseText);
		      }
		  };
		  var fd=new FormData();
		  fd.append("audio_data",blob, filename);
		  xhr.open("POST","upload.php",true);
		  xhr.send(fd);
	})
	li.appendChild(document.createTextNode (" "))//add a space in between
	li.appendChild(upload)//add the upload link to li

	//add the li element to the ol
	while(recordingsList.lastChild)
		recordingsList.removeChild(recordingsList.lastChild);
	recordingsList.appendChild(li);

	fileReading(blob)
}

function fileReading(blob) {

	var reader = new FileReader();
	let file = document.querySelector("audio");
	console.log(file);
	reader.readAsArrayBuffer(blob);
	reader.onLoad = function(){
		console.log("mello ", reader.result);
	};
	reader.onerror = function() {
		console.log("error ", reader.error)
	}
	let i = 0;
	reader.onprogress = function() {
		console.log(" reading data ", ++i);
	}
	// let list = document.querySelector("#list")
	reader.onloadend = function() {

		var buffer = reader.result
		const view = new Int16Array(buffer);
		const newArray = view.slice(400, view.length - 400)
		//console.log(newArray)
		//console.log("done reading data ", ++i, list.length);
		//console.log("new array length ", newArray.length)
		let recognizedDigit = recognize(newArray.length, newArray)

		let recognizedDigitBox = document.querySelector("#recognizedDigit span")
		recognizedDigitBox.innerHTML = `${recognizedDigit}`

		console.log("ans recognized digit", ans, recognizedDigit)
		if(ans == recognizedDigit) {
			
			let text = document.querySelector("#text")
			if(userbase[user+pwd] == undefined)
				userbase[user+pwd] = {text: ""}
			else if(userbase[user+pwd].text == undefined)
				userbase[user+pwd].text = ""
			else
				text.value = userbase[user+pwd].text
			//alert("your answer is correct")
			showContent()
			//generateCaptcha() // for testing should be removed

		} else {
			alert("your answer is wrong. Try with another captcha")
			generateCaptcha()
		}
	}
	console.log("vello ");
}

function signin(e) {

	e.preventDefault()
	
	// let inputs = document.querySelector('#form')
	// inputs.style.display = 'none'

	// let captcha = document.querySelector('#captcha')
	// captcha.style.display = 'flex'

    // let form = document.querySelector("form")
    // form.style.transform = `scale(0.95)`

	user = document.querySelector("input[name=name]").value;
	pwd = document.querySelector("input[name=pwd]").value;

	startRecording()
	console.log(user, pwd)
	//generateCaptcha()
}
generateCaptcha()
// console.log("sample 9")
// recognize(sample9.length, sample9);  
// console.log("sample 1")
// recognize(sample1.length, sample1);  


// console.log("sample _7")
// recognize(_7.length, _7);  
// console.log("sample _1")
// recognize(_1.length, _1); 

function showContent() {
	let content = document.querySelector("#content")
	content.style.transition = "ease 1s	"
	content.style.top = "0"
	content.style.opacity = "1"
	
}

let defaultUserbase = {
	"vishwasvishwas" : {
		text: "vishwas studies in IITG"
	},
	"kushalkushal" : {
		text: "kushal studies in IITG"
	},
	"hrimanhriman" : {
		text: "hriman studies in IITG"
	}
}
var userbase = {}
if(localStorage.getItem("userbase") == null) {
	localStorage.setItem("userbase", JSON.stringify(defaultUserbase))
} else {
	console.log(localStorage.getItem("userbase"))
	userbase = {...JSON.parse((localStorage.getItem("userbase")))}
}

console.log(userbase)
function update(e) {
	console.log(user, pwd)
	console.log(e.target.value)
	
	userbase[user+pwd].text = e.target.value;
	localStorage.setItem("userbase", JSON.stringify(userbase))
}