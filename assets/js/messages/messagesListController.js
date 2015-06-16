/**
* messagesController
**/

define(["step", "whispeerHelper", "asset/state", "bluebird", "controllers/controllerModule"], function (step, h, State, Bluebird, controllerModule) {
	"use strict";

	function messagesController($scope, $state, $stateParams, errorService, messageService) {
		$scope.topics = messageService.data.latestTopics.data;

		var topicsLoadingState = new State();

		function loadTopics() {
			if (topicsLoadingState.isPending()) {
				return;
			}

			topicsLoadingState.pending();
			step(function () {
				messageService.loadMoreLatest(this);	
			}, errorService.failOnError(topicsLoadingState));
		}

		if ($scope.topics.length < 10) {
			loadTopics();
		}

		$scope.loadMoreTopics = function () {
			loadTopics();
		};

		$scope.isActiveTopic = function (topic) {
			return (messageService.isActiveTopic(parseInt(topic.id, 10)));
		};

		$scope.shortenMessage = function (string) {
			if (!string) {
				return "";
			}

			if(string.length > 100) {
				return string.substr(0, 97) + "...";
			} else {
				return string;
			}
		};
	}


	messagesController.$inject = ["$scope", "$state", "$stateParams", "ssn.errorService", "ssn.messageService"];

	controllerModule.controller("ssn.messagesListController", messagesController);
});
