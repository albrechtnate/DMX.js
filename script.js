// let on = false;

// function uni(chan = Array(512).fill(0)){
//   return Uint8Array.from([0x7e, 0x06, 513 & 0xff, (513 >> 8) & 0xff, 0x00].concat(chan, [0xe7]));
// }

// var e = uni();

// .then(function(){
// 	clock = setInterval(() => {
// 		if (on) {
// 			on = false;
// 			self.device.transferOut(2, uni(Array(512).fill(0)));
// 			console.log('off');
// 		} else {
// 			on = true;
// 			self.device.transferOut(2, uni(Array(512).fill(255)));
// 			console.log('on');
// 		}
// 	}, 1000);
// })

// DMX.JS API

let rti = false;

function WebUSBSerialPort(options) {
	var self = this;

	self.universe = Array(512).fill(0);

	options = options || {};
	self.filters = options.filters;

	function openDevice(device) {
		self.device = device;

		self.device.open()
			.then(() => self.device.selectConfiguration(1))
			.then(() => self.device.claimInterface(0))
			.then(function(){
				return  self.device.controlTransferOut({
					'requestType': 'vendor',
					'recipient': 'device',
					'request': 0x0000,
					'value': 0x0002,
					'index': 0x0000
				})
			})
			.then(function(){
				rti = true;
				disconnectBtn = document.createElement('button');
				disconnectBtn.textContent = "Disconnect";
				disconnectBtn.classList = 'btn';
				disconnectBtn.id = 'disconnect-button';
				document.body.append(disconnectBtn);

				disconnectBtn.addEventListener('click', function(){
					self.universe = Array(512).fill(0);
					return self.device.transferOut(2, Uint8Array.from([0x7e, 0x06, 513 & 0xff, (513 >> 8) & 0xff, 0x00].concat(self.universe, [0xe7])))
					.then(()=>self.device.controlTransferOut({
						'requestType': 'vendor',
						'recipient': 'device',
						'request': 0x0000,
						'value': 0x0002,
						'index': 0x0000
					})).then(()=>self.device.close())
					.then(function(){
						document.body.removeChild(disconnectBtn);
					}); 
				});
			});
	}

	self.profiles = {
		genericRGB: function(channels) {
			var profile = this;
			this.channels = channels;
			this.values = Array(this.channels.length).fill(0);
			this.color = function(color) {
				if (Array.isArray(color) && color.length === 3) {
					profile.values[0] = color[0];
					profile.values[1] = color[1];
					profile.values[2] = color[2];
				}
				else {
					var standardize_color = function (str){
						ctx = document.createElement('canvas').getContext('2d');
						ctx.fillStyle = str;
						return ctx.fillStyle;
					}
					var hexToRgb = function (hex) {
						var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
						return result ? [
							parseInt(result[1], 16),
							parseInt(result[2], 16),
							parseInt(result[3], 16)
						] : null;
					}
					var rgb = hexToRgb(standardize_color(color));
					profile.values[0] = rgb[0];
					profile.values[1] = rgb[1];
					profile.values[2] = rgb[2];
				}
				output(profile.channels, profile.values);
			}
		}
	};

	self.fixture = ['', new self.profiles.genericRGB([1, 2, 3])];

	function output(channels, values) {
		channels.forEach(function (channel, index){
			self.universe[channel-1] = values[index];
		});
		if (rti){
			self.device.transferOut(2, Uint8Array.from([0x7e, 0x06, 513 & 0xff, (513 >> 8) & 0xff, 0x00].concat(self.universe, [0xe7])));
		}
		updateIllustraton(values);
	};

	navigator.usb.getDevices()
	.then(function(devices){
		if (devices.length === 0) {
			const connectInfo = document.querySelector(".connect-device")
			const connectBtn = document.querySelector("#connect");
			connectBtn.addEventListener('click', connect);
			connectInfo.style.display = 'block';
			connectBtn.style.display = 'block';

			function connect(){
				navigator.usb.requestDevice({filters: self.filters })
					.then(function(device){
						connectInfo.parentNode.removeChild(connectInfo);
						connectBtn.parentNode.removeChild(connectBtn);
						openDevice(device);
					})
					.catch(function(err){
						console.log(err);
					}
				);
			}
		}
		else {
			openDevice(devices[0]);
		}
	});	
}

var DMX = new WebUSBSerialPort({filters: [{ vendorId: 0x0403, productId: 0x6001 }]});

const myConsole = document.querySelector("#console-input");
const executeBtn = document.querySelector("#execute");
const hint = document.querySelector("#hint");

const commands = ['DMX.fixture[1].color("red");', 'DMX.fixture[1].color("green");', 'DMX.fixture[1].color("blue");', 'DMX.fixture[1].color([255, 0, 128]);'];

let step = 0;
hint.textContent = commands[0];

myConsole.addEventListener('input', function(){
	if (this.value === commands[step]) {
		executeBtn.disabled = false;
	}
	else {
		executeBtn.disabled = true;
	}
});

myConsole.addEventListener('keypress', function(event){
	if (event.keyCode === 13) {
		event.preventDefault();
		if (executeBtn.disabled === false) {
			executeBtn.click();
		}
	}
});

executeBtn.addEventListener('click', function(){
	eval(commands[step]);
	step++;
	executeBtn.disabled = true;
	if (step === commands.length) {
		myConsole.disabled = true;
		myConsole.value = '';
		hint.textContent = "Look at you go! Keep learning below.";
	}
	else {
		myConsole.value = '';
		hint.textContent = commands[step];
	}
});

const LEDS = document.querySelector("#LEDS");
const beamColor1 = document.querySelector("#a1");
const beamColor2 = document.querySelector("#a2");
const beam = document.querySelector("#beam");

function updateIllustraton(values){
	var rgb = `rgb(${values[0]}, ${values[1]}, ${values[2]})`;
	LEDS.style.fill = rgb;
	beamColor1.style.stopColor = rgb;
	beamColor2.style.stopColor = rgb;
	beam.style.opacity = 0.7;
}

const layers = [
	{
		title: 'Lexical Layer',
		paragraph: 'The lexical layer is comprised of the methods and properties that end-developers will use to build their applications. Using a defined vocabulary of words, such as <code>.color()</code> or <code>.intensity()</code> developers can control all the functions of digital lighting devices regardless of how the data is actually transferred to the lighting fixtures.'
	},
	{
		title: 'Universe Layer',
		paragraph: 'The universe layer interperts the commands sent by the lexical layer and manages the 512 Byte Buffer Array, called a universe. Each byte in this array corresponds to one channel in the DMX universe. This lower-level of the API allows developers to create their own fixture profiles or manually set channel values in the case that the lexical api does not yet support a specialized device feature.'
	},
	{
		title: 'Core Transport Layer',
		paragraph: 'The core transport layer relates to the method of how lighting control data is sent from the client application to the endpoints. Some potential options are a traditional USB to DMX device, or ethernet-based protocols like sACN or Artnet.'
	},
	{
		title: 'Connection Layer',
		paragraph: 'The connection layer determines which lower-level API is actually used to transmit the data. In the case of a USB to DMX device, the connection layer could be the WebUSB API, the not-yet-implemented WebSerial API, a Node.js server instance using the NodeSerial library, or a HTTP REST API remotely controlling a Node.js server instance.'
	},
	{
		title: 'Hardware Layer',
		paragraph: 'The lowest level, the hardware layer, specifices the specific communication codes needed to communicate with that particular device. Every different kind of chip requires its own specific communication codes to be used, so a new hardware layer needs to be written for every new device that is supported. Essentially the hardware layer is a traditional device driver, but written it Javascript.'
	}
];
let layer = 0;
const layerTitle = document.querySelector('#api-explanation h3');
const layerParagraph = document.querySelector('#api-explanation p');
const apiPrev = document.querySelector('#api-prev');
const apiNext = document.querySelector('#api-next');
apiNext.addEventListener('click', function(){
	layer++;
	layerTitle.textContent = layers[layer]['title'];
	layerParagraph.innerHTML = layers[layer]['paragraph'];
	document.querySelector('.api-highlighted').classList = '';
	document.querySelector('#api'+layer).classList = 'api-highlighted';
	apiPrev.disabled = false;
	if (layer === layers.length - 1) {
		apiNext.disabled = true;
	}
})
apiPrev.addEventListener('click', function(){
	layer--;
	layerTitle.textContent = layers[layer]['title'];
	layerParagraph.innerHTML = layers[layer]['paragraph'];
	document.querySelector('.api-highlighted').classList = '';
	document.querySelector('#api'+layer).classList = 'api-highlighted';
	apiNext.disabled = false;
	if (layer === 0) {
		apiPrev.disabled = true;
	}
})