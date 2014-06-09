var static = require('node-static');

var cspConfig = {
	"default-src": ["'self'"],
	"script-src": ["'self'"],
	"style-src": ["'self'", "'unsafe-inline'"],
	"object-src": ["'none'"],
	"img-src": ["'self'", "blob:", "data:"]
};

var os=require('os');
var ifaces=os.networkInterfaces();

function pushAddress(details){
	if (details.family=='IPv4') {
		cspConfig["default-src"].push("http://" + details.address + ":3000");
		cspConfig["default-src"].push("ws://" + details.address + ":3000");
	}
}

for (var dev in ifaces) {
	ifaces[dev].forEach(pushAddress);
}

var csp = "";

Object.keys(cspConfig).forEach(function (key) {
	var value = cspConfig[key];
	var current = key + " " + value.join(" ") + "; ";

	csp += current;
});

var fileServer  = new static.Server(".", {
	"Cache-Control": "no-cache, must-revalidate",
	"headers": {
		"content-security-policy": csp
	}
});

require('http').createServer(function (request, response) {
	request.addListener('end', function () {
		fileServer.serve(request, response, function (e, res) {
			if (e && (e.status === 404)) {
				console.log(request.url);
				fileServer.serveFile('/index.html', 200, {}, request, response);
			}
		});
	}).resume();
}).listen(80);

console.log("Server started");