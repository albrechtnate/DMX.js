// Very rough “scratch” code implementing the WebSerial API to control DMX devices.
// This code is specifically written to communicate with Enttec DMX USB Pro devices.
// Works in Chrome 80 with Experimental Web Platform Features Flag enabled.
// Usage: Load script, connect to “cu.” device, call rgbFixture.update(red, green, blue);
//		  Where (r|g|b) = INT 0–255. Assuming 3-channel RGB fixture at DMX address 1.

function WebSerialDMX(update){
	this.update = update;

	this.universe = new Array(512).fill(0);

	this.connect = async function(){this.device = navigator.serial.requestPort()
		.then(r => {
			this.device = r;
		this.device.open({ baudrate: 250000 }).then(() => {
			this.es = new TransformStream();
			this.writer = this.es.writable.getWriter();
			this.es.readable.pipeTo(this.device.writable);
		}).then(() => this.send(this.universe));
	})}();

	this.send = function() {
		this.output = Uint8Array.from([0x7e, 0x06, 513 & 0xff, (513 >> 8) & 0xff, 0x00].concat(this.universe, [0xe7]));
		return this.writer.write(this.output);
	};

	this.connect();
}

const rgbFixture = new WebSerialDMX(function(r,g,b){
	this.universe.splice(0, 3, r, g, b);
	return this.send();
});