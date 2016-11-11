var templateUrl = require("../../views/directives/qrScanner.html");

define(["whispeerHelper", "step", "directives/directivesModule"], function (h, step, directivesModule) {
	"use strict";

	function qrScannerDirective($timeout, errorService) {
		return {
			scope:	{
				callback: "&",
				state: "="
			},
			restrict: "E",
			templateUrl: templateUrl,
			link: function (scope, iElement) {
				var destroyed = false, theStream;

				function captureToCanvas() {
					if (!scope.state.read && !destroyed) {
						step(function () {
							require.ensure(["libs/qrreader"], this);
						}, function (require) {
							var width = 800;
							var height = 600;

							var gCanvas = document.createElement("canvas");
							gCanvas.width = width;
							gCanvas.height = height;

							var gCtx = gCanvas.getContext("2d");
							gCtx.clearRect(0, 0, width, height);

							gCtx.drawImage(iElement.find("video")[0], 0, 0);

	

							var qrreader = require("libs/qrreader");

							var code = qrreader.decodeCanvas(gCanvas);

							scope.state.read = true;
							try {
								theStream.stop();
							} catch (e) {}

							scope.callback({code: code});
						}, function (e) {
							console.error("Canvas loading failed", e);
							$timeout(captureToCanvas, 500);							
						});
					}
				}

				function initializeReader() {
					if (destroyed) {
						return;
					}

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

						if (destroyed) {
							return;
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

				scope.$on("$destroy", function() {
					if (theStream) {
						theStream.stop();
					}
					destroyed = true;
				});

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

	qrScannerDirective.$inject = ["$timeout", "ssn.errorService"];

	directivesModule.directive("qrScanner", qrScannerDirective);
});
