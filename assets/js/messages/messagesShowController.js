/**
* messagesController
**/

define(["step", "whispeerHelper", "asset/state", "bluebird", "messages/messagesModule"], function (step, h, State, Bluebird, messagesModule) {
	"use strict";

	function messagesController($scope, $state, $stateParams, $timeout, localize, errorService, messageService, ImageUploadService) {
		var MINUTE = 60 * 1000;

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

		function Burst() {
			this.messages = [];
		}

		Burst.prototype.addMessage = function (message) {
			this.messages.push(message);
		};

		Burst.prototype.firstMessage = function () {
			return this.messages[0];
		};

		Burst.prototype.hasMessages = function () {
			return this.messages.length > 0;
		};

		Burst.prototype.fitsMessage = function (message) {
			if (!this.hasMessages()) {
				return true;
			}

			return this.sameSender(message) &&
				this.sameDay(message) &&
				this.timeDifference(message) < MINUTE * 10;

		};

		Burst.prototype.sameSender = function (message) {
			return this.firstMessage().sender.id === message.sender.id;
		};

		Burst.prototype.sameDay = function (message) {
			if (!message) {
				return false;
			}

			if (message instanceof Burst) {
				message = message.firstMessage();
			}

			var date1 = new Date(h.parseDecimal(this.firstMessage().timestamp));
			var date2 = new Date(h.parseDecimal(message.timestamp));

			if (date1.getDate() !== date2.getDate()) {
				return false;
			}

			if (date1.getMonth() !== date2.getMonth()) {
				return false;
			}

			if (date1.getFullYear() !== date2.getFullYear()) {
				return false;
			}

			return true;
		};

		Burst.prototype.timeDifference = function (message) {
			return Math.abs(h.parseDecimal(message.timestamp) - h.parseDecimal(this.firstMessage().timestamp));
		};

		Burst.prototype.isMe = function () {
			return this.firstMessage().sender.me;
		};

		Burst.prototype.isOther = function () {
			return !this.firstMessage().sender.me;
		};

		Burst.prototype.sender = function () {
			return this.firstMessage().sender;
		};

		$scope.messageBursts = function() {
			if (!$scope.activeTopic || $scope.activeTopic.messages.length === 0) {
				return [];
			}

			var messages = $scope.activeTopic.messages, currentBurst = new Burst();

			if (burstTopic === $scope.activeTopic.id && burstMessageCount === messages.length) {
				return bursts;
			}

			burstTopic = $scope.activeTopic.id;
			burstMessageCount = messages.length;

			bursts = [currentBurst];

			messages.forEach(function(message) {
				if (!currentBurst.fitsMessage(message)) {
					currentBurst = new Burst();
					bursts.push(currentBurst);
				}

				currentBurst.addMessage(message);
			});

			bursts = bursts.filter(function (burst) {
				return burst.hasMessages();
			});

			return bursts;
		};
	}


	messagesController.$inject = ["$scope", "$state", "$stateParams", "$timeout", "localize", "ssn.errorService", "ssn.messageService", "ssn.imageUploadService"];

	messagesModule.controller("ssn.messagesShowController", messagesController);
});
