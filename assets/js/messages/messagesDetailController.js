/**
* setupController
**/

define(["whispeerHelper", "asset/state", "bluebird", "messages/messagesModule"], function (h, State, Bluebird, messagesModule) {
	"use strict";

	function messagesDetailController($scope, $element, $state, $stateParams, $timeout, localize, errorService, messageService) {
		var topicLoadingState = new State.default();
		$scope.topicLoadingState = topicLoadingState.data;

		topicLoadingState.pending();

		var topicID = h.parseDecimal($stateParams.topicid);

		var topicDetailsSavingState = new State.default();
		$scope.topicDetailsSavingState = topicDetailsSavingState.data;

		$scope.saveTitle = function () {
			topicDetailsSavingState.pending();

			var savePromise = $scope.activeTopic.obj.setTitle($scope.topicTitle).then(function () {
				$state.go("app.messages.show", { topicid: topicID });

				return null;
			});

			errorService.failOnErrorPromise(topicDetailsSavingState, savePromise);
		};

		$scope.topicTitle = "";

		var getTopicPromise = messageService.getTopic(topicID).then(function (topic) {
			messageService.setActiveTopic(topicID);
			$scope.activeTopic = topic.data;

			$scope.topicTitle = topic.data.title || "";			
		});

		errorService.failOnErrorPromise(topicLoadingState, getTopicPromise);
	}

	messagesDetailController.$inject = ["$scope", "$element", "$state", "$stateParams", "$timeout", "localize", "ssn.errorService", "ssn.messageService"];

	messagesModule.controller("ssn.messagesDetailController", messagesDetailController);
});
