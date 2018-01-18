import cssService from "../services/css.service"
var friendsService = require("services/friendsService");
var localize = require("i18n/localizationConfig");
import userService from "../users/userService"

const controllerModule = require("controllers/controllerModule");

const friendsController: any = ($scope) => {
	cssService.setClass("friendsView");
	$scope.friends = [];
	$scope.requests = [];
	$scope.colleagues = []
	$scope.friendsLoading = true;
	$scope.friendsFilter = {
		name: ""
	};

	$scope.removeFriend = function (user) {
		if (confirm(localize.getLocalizedString("magicbar.requests.confirmRemove", { user: user.name }))) {
			user.user.removeAsFriend();
		}
	};

	function loadFriendsUsers() {
		return userService.getMultipleFormatted(friendsService.getFriends())
			.then((result) => {
				$scope.friends = result;
				$scope.friendsLoading = false;
			})
	}

	function loadRequestsUsers() {
		return userService.getMultipleFormatted(friendsService.getRequests())
			.then((result) => $scope.requests = result)
	}

	friendsService.awaitLoading().then(function () {
		friendsService.listen(loadFriendsUsers);
		friendsService.listen(loadRequestsUsers);
		loadFriendsUsers();
		loadRequestsUsers();
	});

	$scope.acceptRequest = function (request) {
		request.user.acceptFriendShip();
	};

	$scope.ignoreRequest = function (request) {
		request.user.ignoreFriendShip();
	};
}

controllerModule.controller("ssn.friendsController", ["$scope", friendsController]);
