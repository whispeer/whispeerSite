/**
* messagesController
**/

define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function messagesController($scope, $routeParams, $location, cssService, messageService) {
		cssService.setClass("messagesView");

		$scope.topicid = 0;

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

			if (e) {
				console.log(e);
			}
		});

		$scope.canSend = false;
		$scope.topicLoaded = false;

		$scope.isActiveTopic = function (topic) {
			return ($scope.topicid === parseInt(topic.id, 10));
		};

		$scope.$on("selectionChange", function (event, newSelection) {
			$scope.new.selectedUsers = newSelection;
		});

		$scope.new = {
			text: "",
			selectedUsers: [],
			send: function (receiver, text) {
				receiver = receiver.map(function (e) {return e.id;});
				messageService.sendNewTopic(receiver, text, function (e, id) {
					$scope.new.text = "";
					$scope.new.selectedUsers = [];
					$scope.loadActiveTopic(id);
					$scope.$broadcast("resetSearch");
				});
			}
		};

		$scope.scrollLock = false;

		$scope.markRead = function (messageid) {
			$scope.activeTopic.obj.markRead(messageid, function (e) {
				if (e) {
					console.log(e);
				}
			});
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

		$scope.unloadTopic = function () {
			$scope.topicLoaded = false;
			$scope.topicid = 0;
			$location.search({});
		};

		$scope.loadActiveTopic = function (id) {
			var theTopic;
			step(function () {
				id = parseInt(id, 10);
				if ($scope.topicid !== id || !$scope.topicLoaded) {
					$scope.topicid = id;
					messageService.getTopic(id, this);
				}
			}, h.sF(function (topic) {
				theTopic = topic;
				$scope.canSend = true;
				$scope.newMessage = false;
				theTopic.loadInitialMessages(this);
			}), h.sF(function () {
				$scope.activeTopic = theTopic.data;

				$scope.topicLoaded = true;

				$location.search({topicid: id});
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

		$scope.showMessage = false;

		$scope.showMessageDo = function() {
			$scope.showMessage = true;
		}

		$scope.showMessageUnDo = function() {
			$scope.showMessage = false;
		}
		

		$scope.topics = messageService.data.latestTopics.data;

		$scope.newMessage = false;
		
	}

	messagesController.$inject = ["$scope", "$routeParams", "$location", "ssn.cssService", "ssn.messageService"];

	return messagesController;
});