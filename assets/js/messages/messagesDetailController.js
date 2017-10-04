"use strict";

const h = require("whispeerHelper").default;
const State = require("asset/state");
const messagesModule = require("messages/messagesModule");

const errorService = require("services/error.service").errorServiceInstance;
const initService = require("services/initService")
const messageService = require("messages/messageService").default

const ChatLoader = require("messages/chat").default

const featureToggles = require("services/featureToggles").default

function messagesDetailController($scope, $element, $state, $stateParams) {
	var chatLoadingState = new State.default();
	$scope.topicLoadingState = chatLoadingState.data;

	chatLoadingState.pending();

	var chatID = h.parseDecimal($stateParams.topicid);

	var chatDetailsSavingState = new State.default();
	$scope.chatDetailsSavingState = chatDetailsSavingState.data;

	$scope.saveTitle = function() {
		chatDetailsSavingState.pending();

		if ($scope.chatTitle === $scope.activeChat.getTitle()) {
			$state.go("app.messages.show", {
				topicid: chatID
			});

			return
		}

		var savePromise = $scope.activeChat.setTitle($scope.chatTitle).then(function() {
			$state.go("app.messages.show", {
				topicid: chatID
			});

			return null;
		});

		errorService.failOnErrorPromise(chatDetailsSavingState, savePromise);
	};

	$scope.amIAdmin = () => $scope.activeChat.amIAdmin()
	$scope.featureEnabled = (featureName) => featureToggles.isFeatureEnabled(featureName)

	$scope.chatTitle = "";

	var getChatPromise = initService.awaitLoading().then(() =>
		ChatLoader.get(chatID)
	).then(function(chat) {
		messageService.setActiveChat(chatID);
		$scope.activeChat = chat;

		$scope.chatTitle = chat.getTitle() || "";
	});

	errorService.failOnErrorPromise(chatLoadingState, getChatPromise);
}

messagesDetailController.$inject = ["$scope", "$element", "$state", "$stateParams"];

messagesModule.controller("ssn.messagesDetailController", messagesDetailController);
