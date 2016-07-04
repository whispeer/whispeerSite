/**
* setupController
**/

define(["step", "whispeerHelper", "asset/state", "bluebird", "messages/messagesModule"], function (step, h, State, Bluebird, messagesModule) {
	"use strict";

	function messagesDetailController($scope, $element, $state, $stateParams, $timeout, localize, errorService, messageService) {
		var topicLoadingState = new State();
		$scope.topicLoadingState = topicLoadingState.data;

		topicLoadingState.pending();

		var topicID = h.parseDecimal($stateParams.topicid);

		var topicDetailsSavingState = new State();
		$scope.topicDetailsSavingState = topicDetailsSavingState.data;

		$scope.saveTitle = function () {
			topicDetailsSavingState.pending();

			var savePromise = $scope.activeTopic.obj.setTitle($scope.topicTitle).then(function () {
				$state.go("app.messages.show", { topicid: topicID });
			});
			errorService.failOnErrorPromise(topicDetailsSavingState, savePromise);
		};

		$scope.topicTitle = "";

		var topic;
		step(function () {
			messageService.getTopic(topicID, this);
		}, h.sF(function (_topic) {
			topic = _topic;

			messageService.setActiveTopic(topicID);
			$scope.activeTopic = topic.data;

			$scope.topicTitle = topic.data.title || "";

			console.log(topic.data);
		}), errorService.failOnError(topicLoadingState));
	}

	messagesDetailController.$inject = ["$scope", "$element", "$state", "$stateParams", "$timeout", "localize", "ssn.errorService", "ssn.messageService"];

	messagesModule.controller("ssn.messagesDetailController", messagesDetailController);
});
