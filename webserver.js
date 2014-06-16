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

cspConfig["default-src"].push("https://beta.whispeer.de:3001");
cspConfig["default-src"].push("wss://beta.whispeer.de:3001");

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

var angular = ["user", "messages", "circles", "main", "friends", "login", "loading", "help", "settings"];

require('http').createServer(function (request, response) {
	request.addListener('end', function () {
		fileServer.serve(request, response, function (e, res) {
			if (e && (e.status === 404)) {
				var dir = request.url.split(/\/|\?/)[1];

				if (angular.indexOf(dir) === -1) {
					console.error("File not found: " + request.url);
					fileServer.serveFile('/index.html', 404, {}, request, response);
				} else {
					fileServer.serveFile('/index.html', 200, {}, request, response);
				}
			}
		});
	}).resume();
}).listen(80);

console.log("Server started");