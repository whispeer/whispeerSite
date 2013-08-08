/**
* requestsController
**/

define([], function () {
	"use strict";

	function requestsController($scope)  {
		$scope.shortenName = function (name) {
			if(name.length > 17) {
				return name.substr(0, 17) + "..";
			} else {
				return name;
			}
		};
		$scope.requests = [
			{
				"id":	"1",
				"user": {
					"id": "1",
					"name": "Willi Welle",
					"mutuals":	"30",
					"image":	"img/profil.jpg"
				}
			}
		];
	}

	requestsController.$inject = ["$scope"];

	return requestsController;
});