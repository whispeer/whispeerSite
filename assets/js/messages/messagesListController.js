/**
* messagesController
**/

define(["step", "whispeerHelper", "asset/state", "bluebird", "controllers/controllerModule"], function (step, h, State, Bluebird, controllerModule) {
	"use strict";

	function messagesController($scope, $state, $stateParams, errorService, messageService) {
		$scope.topicid = 0;
		$scope.showMessage = !$scope.mobile;

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

		loadTopics();

		$scope.loadMoreTopics = function () {
			loadTopics();
		};

		$scope.isActiveTopic = function (topic) {
			return ($scope.topicid === parseInt(topic.id, 10));
		};

		$scope.goToShow = function (topicid) {
			$state.go("app.messages.show", {
				topicid: topicid
			});
		};

		$scope.goToNew = function () {
			$state.go("app.messages.new");
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

		$scope.topics = messageService.data.latestTopics.data;

		$scope.newMessage = false;

	}


	messagesController.$inject = ["$scope", "$state", "$stateParams", "ssn.errorService", "ssn.messageService"];

	controllerModule.controller("ssn.messagesListController", messagesController);
});
