/**
* messagesController
**/

define(["step", "whispeerHelper", "asset/state", "bluebird", "controllers/controllerModule"], function (step, h, State, Bluebird, controllerModule) {
	"use strict";

	function messagesController($scope, $stateParams, errorService, messageService, userService) {
		$scope.canSend = false;
		$scope.topicLoaded = false;

		var sendMessageState = new State();
		$scope.sendMessageState = sendMessageState.data;

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


		$scope.topics = messageService.data.latestTopics.data;

		function getUser(userid) {
			var findUser = Bluebird.promisify(userService.get, userService);

			return findUser(userid).then(function (user) {
				var loadBasicData = Bluebird.promisify(user.loadBasicData, user);

				return loadBasicData().then(function () {
					return [user.data];
				});
			});
		}

		function loadInitialUser() {
			if (!$stateParams.userid) {
				return Bluebird.resolve([]);
			}

			var getUserTopic = Bluebird.promisify(messageService.getUserTopic, messageService);

			return getUserTopic($stateParams.userid).then(function (topicid) {
				if (topicid) {
					$scope.loadActiveTopic(topicid);
					return [];
				} else {
					return getUser($stateParams.userid);
				}
			});
		}

		$scope.loadActiveTopic = function () {
			//TODO
		};

		var loadInitialUserPromise = loadInitialUser();

		$scope.getInitialUser = function () {
			return loadInitialUserPromise;
		};

	}


	messagesController.$inject = ["$scope", "$stateParams", "ssn.errorService", "ssn.messageService", "ssn.userService"];

	controllerModule.controller("ssn.messagesCreateController", messagesController);
});
