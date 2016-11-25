/**
* messagesController
**/

define(["jquery", "whispeerHelper", "asset/state", "bluebird", "messages/messagesModule"], function (jQuery, h, State, Bluebird, messagesModule) {
	"use strict";

	function messagesController($scope, $element, $state, $stateParams, $timeout, localize, errorService, messageService, ImageUploadService, TopicUpdate) {
		var MINUTE = 60 * 1000;

		var topicLoadingState = new State();
		$scope.topicLoadingState = topicLoadingState.data;

		var topicID = h.parseDecimal($stateParams.topicid);

		$scope.canSend = false;
		$scope.topicLoaded = false;

		$scope.hideOverlay = false;

		$scope.doHideOverlay = function () {
			$scope.hideOverlay = true;
		};

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
			var loadMore = Bluebird.promisify($scope.activeTopic.obj.loadMoreMessages.bind($scope.activeTopic.obj));

			$scope.loadingMessages = true;
			return loadMore().then(function () {
				$scope.loadingMessages = false;
			});
		};

		$scope.$on("$destroy", function () {
			messageService.setActiveTopic(0);
		});

		topicLoadingState.pending();

		function isTopicUpdate(obj) {
			return obj instanceof TopicUpdate;
		}

		function loadMoreUntilFull() {
			Bluebird.delay(500).then(function () {
				var scroller = $element.find(".scroll-pane");

				var outerHeight = scroller.height();
				var innerHeight = 0;
				scroller.children().each(function(){
					innerHeight = innerHeight + jQuery(this).outerHeight(true);
				});

				if (outerHeight > innerHeight) {
					return $scope.loadMoreMessages().then(function () {
						loadMoreUntilFull();
					});
				}
			});
		}

		var loadTopicsPromise = messageService.getTopic(topicID).then(function (topic) {
			messageService.setActiveTopic(topicID);
			$scope.activeTopic = topic.data;

			$scope.canSend = true;
			$scope.newMessage = false;
			return topic.loadInitialMessages().thenReturn(topic);
		}).then(function (topic) {
			$scope.topicLoaded = true;

			if (topic.data.messagesAndUpdates.length > 0) {
				topic.markRead(errorService.criticalError);
			}

			loadMoreUntilFull();
		});

		errorService.failOnErrorPromise(topicLoadingState, loadTopicsPromise);

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

			var sendMessagePromise = messageService.sendMessage($scope.activeTopic.id, text, images).then(function () {
				$scope.activeTopic.newMessage = "";
				$scope.images.images = [];
				$scope.markRead(errorService.criticalError);
				$timeout(function () {
					sendMessageState.reset();
				}, 2000);				
			});

			sendMessagePromise.catch(function () {
				$scope.canSend = true;
			});

			errorService.failOnErrorPromise(sendMessageState, sendMessagePromise);
		};

		var bursts = [], burstTopic;

		function Burst() {
			this.messages = [];
		}

		Burst.prototype.hasMessage = function (message) {
			return this.messages.indexOf(message) > -1;
		};

		Burst.prototype.addMessage = function (message) {
			this.messages.push(message);

			this.messages.sort(function (m1, m2) {
				return m1.getTime() - m2.getTime();
			});
		};

		Burst.prototype.removeAllExceptLast = function () {
			this.messages.splice(0, this.messages.length - 1);
		};

		Burst.prototype.firstMessage = function () {
			return this.messages[0];
		};

		Burst.prototype.lastMessage = function () {
			return this.messages[this.messages.length - 1];
		};

		Burst.prototype.isMessageBurst = function () {
			return !this.isTopicUpdate();
		};

		Burst.prototype.isTopicUpdate = function () {
			return isTopicUpdate(this.firstMessage());
		};

		Burst.prototype.hasMessages = function () {
			return this.messages.length > 0;
		};

		Burst.prototype.fitsMessage = function (message) {
			if (!this.hasMessages()) {
				return true;
			}

			if (isTopicUpdate(this.firstMessage()) || isTopicUpdate(message)) {
				return false;
			}

			return this.sameSender(message) &&
				this.sameDay(message) &&
				this.timeDifference(message) < MINUTE * 10;

		};

		Burst.prototype.sameSender = function (message) {
			return this.firstMessage().data.sender.id === message.data.sender.id;
		};

		Burst.prototype.sameDay = function (message) {
			if (!message) {
				return false;
			}

			if (message instanceof Burst) {
				message = message.firstMessage();
			}

			var date1 = new Date(h.parseDecimal(this.firstMessage().getTime()));
			var date2 = new Date(h.parseDecimal(message.getTime()));

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
			return Math.abs(h.parseDecimal(message.getTime()) - h.parseDecimal(this.firstMessage().getTime()));
		};

		Burst.prototype.isMe = function () {
			return this.isMessageBurst() && this.firstMessage().data.sender.me;
		};

		Burst.prototype.isOther = function () {
			return this.isMessageBurst() && !this.firstMessage().data.sender.me;
		};

		Burst.prototype.sender = function () {
			return this.firstMessage().data.sender;
		};

		function getNewElements(messagesAndUpdates, bursts) {
			return messagesAndUpdates.filter(function (message) {
				return bursts.reduce(function (prev, current) {
					return prev && !current.hasMessage(message);
				}, true);
			});
		}

		function calculateBursts(messages) {
			var bursts = [new Burst()];
			var currentBurst = bursts[0];

			messages.sort(function (m1, m2) {
				return m2.getTime() - m1.getTime();
			});

			messages.forEach(function (messageOrUpdate) {
				if(!currentBurst.fitsMessage(messageOrUpdate)) {
					currentBurst = new Burst();
					bursts.push(currentBurst);
				}

				currentBurst.addMessage(messageOrUpdate);
			});

			return bursts;
		}

		function hasMatchingMessage(oldBurst, newBurst) {
			var matchingMessages = newBurst.messages.filter(function (message) {
				return oldBurst.hasMessage(message);
			});

			return matchingMessages.length > 0;
		}

		function addBurst(bursts, burst) {
			bursts.push(burst);

			return true;
		}

		function mergeBurst(oldBurst, newBurst) {
			var newMessages = newBurst.messages.filter(function (message) {
				return !oldBurst.hasMessage(message);
			});

			newMessages.forEach(function (message) {
				oldBurst.addMessage(message);
			});

			return true;
		}

		function addBurstOrMerge(bursts, burst) {
			var possibleMatches = bursts.filter(function (oldBurst) {
				return hasMatchingMessage(oldBurst, burst);
			});

			if (possibleMatches.length === 0) {
				return addBurst(bursts, burst);
			}

			if (possibleMatches.length === 1) {
				return mergeBurst(possibleMatches[0], burst);
			}

			if (possibleMatches.length > 1) {
				errorService.criticalError(new Error("Burst merging possible matches > 1 wtf..."));
				return false;
			}
		}

		function mergeBursts(bursts, newBursts) {
			return newBursts.reduce(function (prev, burst) {
				return prev && addBurstOrMerge(bursts, burst);
			}, true);
		}

		function getBursts() {
			if (!$scope.activeTopic || $scope.activeTopic.messagesAndUpdates.length === 0) {
				return [];
			}

			var messagesAndUpdates = $scope.activeTopic.messagesAndUpdates;

			if (burstTopic !== $scope.activeTopic.id) {
				bursts = calculateBursts(messagesAndUpdates);
				burstTopic = $scope.activeTopic.id;

				return bursts;
			}

			var newElements = getNewElements(messagesAndUpdates, bursts);
			if (newElements.length === 0) {
				return bursts;
			}

			console.warn(bursts, newElements);

			bursts.forEach(function (burst) {
				if (!isTopicUpdate(burst)) {
					burst.removeAllExceptLast();
				}
			});

			var newBursts = calculateBursts(messagesAndUpdates);
			if (!mergeBursts(bursts, newBursts)) {
				console.warn("Rerender all bursts!");
				bursts = newBursts;
			}

			return bursts;			
		}

		$scope.messageBursts = function() {
			var bursts = getBursts();

			bursts.sort(function (b1, b2) {
				return b1.firstMessage().getTime() - b2.firstMessage().getTime();
			});

			return bursts;
		};

		$scope.showMessageOptions = false;
		$scope.toggleMessageOptions = function() {
			$scope.showMessageOptions = !$scope.showMessageOptions;
		};
	}

	messagesController.$inject = ["$scope", "$element", "$state", "$stateParams", "$timeout", "localize", "ssn.errorService", "ssn.messageService", "ssn.imageUploadService", "ssn.models.topicUpdate"];

	messagesModule.controller("ssn.messagesShowController", messagesController);
});
