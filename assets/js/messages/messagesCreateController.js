/**
* messagesController
**/

define(["step", "whispeerHelper", "asset/state", "bluebird", "controllers/controllerModule"], function (step, h, State, Bluebird, controllerModule) {
	"use strict";

	function messagesController($scope, $state, $stateParams, errorService, messageService, userService, ImageUploadService) {
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
			images: [],
			removeImage: function (index) {
				$scope.create.images.splice(index, 1);
			},
			addImages: ImageUploadService.fileCallback(function (newImages) {
				$scope.$apply(function () {
					$scope.create.images = $scope.create.images.concat(newImages);
				});
			}),
			send: function (receiver, text, images) {
				images = images || [];

				sendMessageState.pending();

				if (text === "" && images.length === 0) {
					sendMessageState.failed();
					return;
				}

				step(function () {
					messageService.sendNewTopic(receiver, text, images, this);
				}, h.sF(function (id) {
					$scope.create.text = "";
					$scope.create.selectedElements = [];
					$scope.goToShow(id);
					$scope.$broadcast("resetSearch");					
				}), errorService.failOnError(sendMessageState));
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
					$scope.goToShow(topicid);
					return [];
				} else {
					return getUser($stateParams.userid);
				}
			});
		}

		$scope.goToShow = function (topicid) {
			$state.go("app.messages.show", {
				topicid: topicid
			});
		};

		var loadInitialUserPromise = loadInitialUser();

		$scope.getInitialUser = function () {
			return loadInitialUserPromise;
		};

	}


	messagesController.$inject = ["$scope", "$state", "$stateParams", "ssn.errorService", "ssn.messageService", "ssn.userService", "ssn.imageUploadService"];

	controllerModule.controller("ssn.messagesCreateController", messagesController);
});
