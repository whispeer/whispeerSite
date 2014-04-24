/**
* messagesController
**/

define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function messagesController($scope, $routeParams, $location, $timeout, errorService, cssService, messageService) {
		cssService.setClass("messagesView");

		$scope.topicid = 0;
		$scope.showMessage = !$scope.mobile;

		$scope.$watch(function () { return $routeParams["userid"]; }, function () {
			if ($routeParams["userid"]) {
				$scope.userid = $routeParams["userid"];
				step(function () {
					messageService.getUserTopic($scope.userid, this);
				}, h.sF(function (topicid) {
					if (topicid) {
						$scope.loadActiveTopic(topicid);
					}
				}));
			}
		});

		$scope.$watch(function(){ return $routeParams["topicid"]; }, function(){
			if ($routeParams["topicid"]) {
				$scope.loadActiveTopic($routeParams["topicid"]);
			} else {
				$scope.topicLoaded = false;
			}
		});

		messageService.loadMoreLatest(function (e) {
			if ($routeParams["topicid"]) {
				$scope.loadActiveTopic($routeParams["topicid"]);
			}

			errorService.criticalError(e);
		});

		$scope.canSend = false;
		$scope.topicLoaded = false;

		$scope.isActiveTopic = function (topic) {
			return ($scope.topicid === parseInt(topic.id, 10));
		};

		$scope.new = {
			text: "",
			selectedElements: [],
			send: function (receiver, text) {
				messageService.sendNewTopic(receiver, text, function (e, id) {
					if (!e) {
						$scope.new.text = "";
						$scope.new.selectedElements = [];
						$scope.loadActiveTopic(id);
						$scope.$broadcast("resetSearch");
					} else {
						//TODO!!
						debugger;
					}
				});
			}
		};

		$scope.scrollLock = false;

		$scope.markRead = function (messageid) {
			$scope.activeTopic.obj.markRead(messageid, errorService.criticalError);
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
						theTopic.markRead(m[m.length - 1].id, errorService.criticalError);
					}
				});
			}));
		};

		$scope.sendMessage = function () {
			step(function () {
				$scope.canSend = false;
				messageService.sendMessage($scope.activeTopic.id, $scope.activeTopic.newMessage, this);
			}, function () {
				$scope.canSend = true;
				$scope.activeTopic.newMessage = "";
			});
		};
		

		$scope.topics = messageService.data.latestTopics.data;

		$scope.newMessage = false;
		
	}

	messagesController.$inject = ["$scope", "$routeParams", "$location", "$timeout", "ssn.errorService", "ssn.cssService", "ssn.messageService"];

	return messagesController;
});