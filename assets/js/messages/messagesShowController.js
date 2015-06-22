/**
* messagesController
**/

define(["step", "whispeerHelper", "asset/state", "bluebird", "messages/messagesModule"], function (step, h, State, Bluebird, messagesModule) {
	"use strict";

	function messagesController($scope, $state, $stateParams, $timeout, localize, errorService, messageService, ImageUploadService) {
		$scope.topicid = 0;

		$scope.canSend = false;
		$scope.topicLoaded = false;

		$scope.scrollLock = false;

		$scope.images = {
			images: [],
			removeImage: function (index) {
				$scope.images.images.splice(index, 1);
			},
			addImages: ImageUploadService.fileCallback(function (newImages) {
				$scope.$apply(function () {
					$scope.images.images = $scope.images.images.concat(newImages);
				});
			})
		};

		$scope.markRead = function () {
			$scope.activeTopic.obj.markRead(errorService.criticalError);
		};

		$scope.loadMoreMessages = function () {
			$scope.scrollLock = true;
			$scope.loadingMessages = true;
			$scope.activeTopic.obj.loadMoreMessages(function () {
				$scope.loadingMessages = false;
				$scope.scrollLock = false;
			});
		};

		$scope.$on("$destroy", function () {
			messageService.setActiveTopic(0);
		});

		$scope.loadActiveTopic = function (id) {
			var theTopic;
			step(function () {
				id = parseInt(id, 10);

				messageService.setActiveTopic(id);
				messageService.getTopic(id, this);
			}, h.sF(function (topic) {
				theTopic = topic;
				$scope.canSend = true;
				$scope.newMessage = false;
				theTopic.loadInitialMessages(this);
			}), h.sF(function () {
				$timeout(function () {
					$scope.activeTopic = theTopic.data;

					$scope.topicLoaded = true;

					if (theTopic.data.messages.length > 0) {
						theTopic.markRead(errorService.criticalError);
					}
				});
			}));
		};

		$scope.loadActiveTopic($stateParams.topicid);

		var sendMessageState = new State();
		$scope.sendMessageState = sendMessageState.data;

		$scope.sendMessage = function () {
			sendMessageState.pending();

			var images = $scope.images.images;
			var text = $scope.activeTopic.newMessage;

			if (text === "" && images.length === 0) {
				sendMessageState.failed();
				return;
			}

			$scope.canSend = false;

			step(function () {
				messageService.sendMessage($scope.activeTopic.id, text, images, this);
			}, h.sF(function () {
				$scope.activeTopic.newMessage = "";
				$scope.images.images = [];
				$scope.markRead(errorService.criticalError);
				$timeout(function () {
					sendMessageState.reset();
				}, 2000);
				this.ne();
			}), function (e) {
				$scope.canSend = true;
				this(e);
			}, errorService.failOnError(sendMessageState));
		};

		var burstMessageCount = 0, bursts = [], burstTopic;

		$scope.messageBursts = function() {
			if (!$scope.activeTopic) {
				return [];
			}

			var previousSender, messages = $scope.activeTopic.messages, currentBurst = [];

			if (burstTopic === $scope.activeTopic.id && burstMessageCount === messages.length) {
				return bursts;
			}

			if (messages.length === 0) {
				return [];
			}

			bursts = [];

			burstTopic = $scope.activeTopic.id;
			burstMessageCount = messages.length;

			previousSender = messages[0].sender.id;

			messages.forEach(function(message) {
				if (currentBurst.length > 0 && previousSender !== message.sender.id) {
					bursts.push(currentBurst);
					currentBurst = [];
					previousSender = message.sender.id;
				}
				currentBurst.push(message);
			});

			if (currentBurst.length > 0) {
				bursts.push(currentBurst);
			}

			return bursts;
		};
	}


	messagesController.$inject = ["$scope", "$state", "$stateParams", "$timeout", "localize", "ssn.errorService", "ssn.messageService", "ssn.imageUploadService"];

	messagesModule.controller("ssn.messagesShowController", messagesController);
});
