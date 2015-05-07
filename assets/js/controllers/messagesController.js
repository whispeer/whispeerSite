/**
* messagesController
**/

define(["step", "whispeerHelper", "asset/state", "controllers/controllerModule"], function (step, h, State, controllerModule) {
	"use strict";

	function messagesController($scope, $stateParams, $location, $timeout, errorService, cssService, messageService) {
		cssService.setClass("messagesView", true);

		$scope.topicid = 0;
		$scope.showMessage = !$scope.mobile;

		var topicsLoadingState = new State();

		$scope.$watch(function () { return $stateParams.userid; }, function () {
			if ($stateParams.userid) {
				$scope.userid = $stateParams.userid;
				step(function () {
					messageService.getUserTopic($scope.userid, this);
				}, h.sF(function (topicid) {
					if (topicid) {
						$scope.loadActiveTopic(topicid);
					}
				}));
			}
		});

		$scope.$watch(function(){ return $stateParams.topicid; }, function () {
			if ($stateParams.topicid) {
				$scope.loadActiveTopic($stateParams.topicid);
			} else {
				$scope.topicLoaded = false;
			}
		});

		function loadTopics(initial) {
			if (topicsLoadingState.isPending()) {
				return;
			}

			topicsLoadingState.pending();
			step(function () {
				messageService.loadMoreLatest(this);	
			}, h.sF(function () {
				if ($stateParams.topicid && initial) {
					$scope.loadActiveTopic($stateParams.topicid);
				}
				this.ne();
			}), errorService.failOnError(topicsLoadingState));
		}

		loadTopics(true);

		$scope.canSend = false;
		$scope.topicLoaded = false;

		$scope.loadMoreTopics = function () {
			loadTopics(true);
		};

		$scope.isActiveTopic = function (topic) {
			return ($scope.topicid === parseInt(topic.id, 10));
		};

		$scope.create = {
			text: "",
			setUsers: function (users) {
				$scope.create.users = users;
			},
			users: [],
			send: function (receiver, text) {
				sendMessageState.pending();

				if (text === "") {
					sendMessageState.failed();
					return;
				}

				messageService.sendNewTopic(receiver, text, function (e, id) {
					if (!e) {
						$scope.create.text = "";
						$scope.create.selectedElements = [];
						$scope.loadActiveTopic(id);
						$scope.$broadcast("resetSearch");
					}

					this.ne(e);
				}, errorService.failOnError(sendMessageState));
			}
		};

		$scope.scrollLock = false;

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

		$scope.unloadTopic = function (bool) {
			bool = (typeof bool === "undefined") ? true : bool;
			$scope.topicLoaded = false;
			$scope.showMessage = bool; // show newMessage
			$scope.topicid = 0;
			$location.search({});
		};

		$scope.$on("$destroy", function () {
			messageService.setActiveTopic(0);
		});

		$scope.loadActiveTopic = function (id) {
			var theTopic;
			step(function () {
				id = parseInt(id, 10);
				if ($scope.topicid !== id || !$scope.topicLoaded) {
					$scope.topicid = id;
					sendMessageState.reset();
					messageService.setActiveTopic(id);
					messageService.getTopic(id, this);
				}
			}, h.sF(function (topic) {
				theTopic = topic;
				$scope.canSend = true;
				$scope.newMessage = false;
				theTopic.loadInitialMessages(this);
			}), h.sF(function () {
				$timeout(function () {
					$scope.activeTopic = theTopic.data;

					$scope.topicLoaded = true;
					$scope.showMessage = true;

					$location.search({topicid: id});

					var m = theTopic.data.messages;
					if (m.length > 0) {
						theTopic.markRead(errorService.criticalError);
					}
				});
			}));
		};

		var sendMessageState = new State();
		$scope.sendMessageState = sendMessageState.data;

		$scope.sendMessage = function () {
			sendMessageState.pending();

			var n = $scope.activeTopic.newMessage;
			if (typeof n === "undefined" || n === "") {
				sendMessageState.failed();
				return;
			}

			$scope.canSend = false;

			step(function () {
				messageService.sendMessage($scope.activeTopic.id, n, this);
			}, function (e) {
				$scope.canSend = true;
				if (!e) {
					$scope.activeTopic.newMessage = "";
					$scope.markRead(errorService.criticalError);
					$timeout(function () {
						sendMessageState.reset();
					}, 2000);
				}

				this(e);
			}, errorService.failOnError(sendMessageState));
		};


		$scope.topics = messageService.data.latestTopics.data;

		$scope.newMessage = false;

		var burstMessageCount = 0, bursts = [], burstTopic;

		$scope.messageBursts = function() {
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


	messagesController.$inject = ["$scope", "$stateParams", "$location", "$timeout", "ssn.errorService", "ssn.cssService", "ssn.messageService"];

	controllerModule.controller("ssn.messagesController", messagesController);
});
