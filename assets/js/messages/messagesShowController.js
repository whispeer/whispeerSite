/**
* messagesController
**/

define(["step", "whispeerHelper", "asset/state", "bluebird", "messages/messagesModule"], function (step, h, State, Bluebird, messagesModule) {
	"use strict";

	function messagesController($scope, $element, $state, $stateParams, $timeout, localize, errorService, messageService, ImageUploadService, friendsService, userService) {
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
			var loadMore = Bluebird.promisify($scope.activeTopic.obj.loadMoreMessages, $scope.activeTopic.obj);

			$scope.loadingMessages = true;
			return loadMore().then(function () {
				$scope.loadingMessages = false;
			});
		};

		$scope.$on("$destroy", function () {
			messageService.setActiveTopic(0);
		});

		topicLoadingState.pending();

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

		var topic;
		step(function () {
			messageService.getTopic(topicID, this);
		}, h.sF(function (_topic) {
			topic = _topic;

			messageService.setActiveTopic(topicID);
			$scope.activeTopic = topic.data;

			$scope.canSend = true;
			$scope.newMessage = false;
			topic.loadInitialMessages(this);
		}), h.sF(function () {
			$scope.topicLoaded = true;

			if (topic.data.messages.length > 0) {
				topic.markRead(errorService.criticalError);
			}

			loadMoreUntilFull();

			this.ne();
		}), errorService.failOnError(topicLoadingState));

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
				return m1.timestamp - m2.timestamp;
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

		function getMatchingBurst(bursts, message) {
			var fittingBursts = bursts.filter(function (burst, index, bursts) {
				var nextBurst = bursts[index + 1], previousBurst = bursts[index - 1];

				if (!burst.fitsMessage(message)) {
					return false;
				}

				if (nextBurst && nextBurst.firstMessage().timestamp < message.timestamp) {
					return false;
				}

				if (previousBurst && previousBurst.lastMessage().timestamp > message.timestamp) {
					return false;
				}

				return true;
			});

			if (fittingBursts.length > 1) {
				console.warn("There should only be one fitting burst!");
			}

			if (fittingBursts.length === 0) {
				var newBurst = new Burst();
				bursts.push(newBurst);

				return newBurst;
			}

			return fittingBursts[0];
		}

		function getNewMessages(messages, bursts) {
			return messages.filter(function (message) {
				return bursts.reduce(function (prev, current) {
					return prev && !current.hasMessage(message);
				}, true);
			});
		}

		$scope.messageBursts = function() {
			if (!$scope.activeTopic || $scope.activeTopic.messages.length === 0) {
				return [];
			}

			var messages = $scope.activeTopic.messages;

			if (getNewMessages(messages, bursts).length === 0) {
				return bursts;
			}

			bursts.forEach(function (burst) {
				burst.removeAllExceptLast();
			});

			if (burstTopic !== $scope.activeTopic.id) {
				bursts = [new Burst()];
			}

			var newMessages = getNewMessages(messages, bursts);

			if (newMessages.length === 0) {
				return bursts;
			}

			newMessages.sort(function (m1, m2) {
				return m2.timestamp - m1.timestamp;
			});

			burstTopic = $scope.activeTopic.id;

			newMessages.forEach(function(message) {
				var burst = getMatchingBurst(bursts, message);
				burst.addMessage(message);

				bursts.sort(function (b1, b2) {
					return b1.firstMessage().timestamp - b2.firstMessage().timestamp;
				});
			});

			return bursts;
		};

		$scope.editingTitle = false;
		$scope.toggleEdit = function() {
			$scope.showMessageOptions = false;
			$scope.editingTitle = !$scope.editingTitle;
		};

		$scope.showMessageOptions = false;
		$scope.toggleMessageOptions = function() {
			$scope.showMessageOptions = !$scope.showMessageOptions;
		};

		$scope.friendsLoading = true;
		$scope.addFriendsActive = false;
		function loadFriendsUsers() {
			step(function () {
				var friends = friendsService.getFriends();
				userService.getMultipleFormatted(friends, this);
			}, h.sF(function (result) {
				$scope.friends = result;
				$scope.friendsLoading = false;
			}));
		}

		$scope.toggleFriendsDropdown = function() {
			$scope.showMessageOptions = false;
			$scope.addFriendsActive = !$scope.addFriendsActive;
			if ($scope.addFriendsActive) {
				loadFriendsUsers();
			}
		};
	}

	messagesController.$inject = ["$scope", "$element", "$state", "$stateParams", "$timeout", "localize", "ssn.errorService", "ssn.messageService", "ssn.imageUploadService", "ssn.friendsService", "ssn.userService"];

	messagesModule.controller("ssn.messagesShowController", messagesController);
});
