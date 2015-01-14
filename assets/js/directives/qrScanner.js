define(["whispeerHelper", "step", "libs/qrreader"], function (h, step, qrreader) {
	"use strict";

	function personDirective($timeout, errorService) {
		return {
			scope:	{
				callback: "&",
				state: "="
			},
			restrict: "E",
			templateUrl: "assets/views/directives/qrScanner.html",
			link: function (scope, iElement) {
				function captureToCanvas() {
					if (!scope.state.read) {
						try {
							var width = 800;
							var height = 600;

							var gCanvas = document.createElement("canvas");
							gCanvas.width = width;
							gCanvas.height = height;

							var gCtx = gCanvas.getContext("2d");
							gCtx.clearRect(0, 0, width, height);

							gCtx.drawImage(iElement.find("video")[0], 0, 0);
							var code = qrreader.decodeCanvas(gCanvas);

							scope.state.read = true;
							theStream.stop();

							scope.callback({code: code});
						} catch(e) {
							console.error(e);
							$timeout(captureToCanvas, 500);
						}
					}
				}

				function initializeReader() {
					var webkit=false;
					var moz=false;

					step(function () {
						if (window.MediaStreamTrack && window.MediaStreamTrack.getSources) {
							window.MediaStreamTrack.getSources(this.ne);
						} else {
							this.ne();
						}
					}, h.sF(function (sources) {
						var constraints = {
							audio: false,
							video: true
						};

						if (sources) {
							var environmentSources = sources.filter(function (data) {
								return data.kind === "video" && data.facing === "environment";
							});

							if (environmentSources.length === 1) {
								constraints.video = { optional: [{sourceId: environmentSources[0].id}] };
							}
						}

						if(navigator.getUserMedia) {
							navigator.getUserMedia(constraints, this.ne, this);
						} else if(navigator.webkitGetUserMedia) {
							webkit=true;
							navigator.webkitGetUserMedia(constraints, this.ne, this);
						} else if(navigator.mozGetUserMedia) {
							moz=true;
							navigator.mozGetUserMedia(constraints, this.ne, this);
						}
					}), h.sF(function (stream) {
						scope.state.noDevice = false;
						theStream = stream;
						var v = iElement.find("video")[0];

						if(webkit) {
							v.src = window.webkitURL.createObjectURL(stream);
						} else if(moz) {
							v.mozSrcObject = stream;
							v.play();
						} else {
							v.src = stream;
						}

						$timeout(captureToCanvas, 500);
					}), function (e) {
						if (e.name === "DevicesNotFoundError") {
							scope.state.noDevice = true;

							$timeout(initializeReader, 1000);
						} else {
							this(e);
						}
					}, errorService.criticalError);
				}

				scope.state = scope.state || {};

				scope.state.available = !!(navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia);
				scope.state.noDevice = false;
				scope.state.read = false;
				scope.state.reset = function () {
					if (scope.state.read) {
						scope.state.read = false;
						initializeReader();
					}
				};

				var theStream;

				if (scope.state.enabled) {
					initializeReader();
				} else {
					scope.$watch(function () { return scope.state.enabled; }, function (isEnabled) {
						if (isEnabled) {
							initializeReader();
						}
					});
				}
			}
		};
	}

	personDirective.$inject = ["$timeout", "ssn.errorService"];

	return personDirective;
});