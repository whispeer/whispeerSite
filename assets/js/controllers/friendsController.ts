import * as Bluebird from "bluebird"

import cssService from "../services/css.service"
import userService from "../users/userService"
import CompanyLoader, { getOwnCompanyID } from "../services/companyService"

var friendsService = require("../services/friendsService")
var localize = require("../i18n/localizationConfig")

const controllerModule = require("../controllers/controllerModule")

const friendsController: any = ($scope) => {
	cssService.setClass("friendsView")

	$scope.requests = []

	let contacts = []
	let colleagues = []

	let contactsLoading = true
	let colleaguesLoading = true

	$scope.contactsFilter = {
		name: ""
	}

	$scope.showColleagues = WHISPEER_BUSINESS

	$scope.isBusiness = () => WHISPEER_BUSINESS

	$scope.setShowColleagues = (val) =>
		$scope.showColleagues = !!val

	$scope.isLoading = () =>
		WHISPEER_BUSINESS && $scope.showColleagues ? colleaguesLoading : contactsLoading
	$scope.getContacts = () =>
		WHISPEER_BUSINESS && $scope.showColleagues ? colleagues : contacts

	$scope.removeFriend = (user) => {
		if (confirm(localize.getLocalizedString("magicbar.requests.confirmRemove", { user: user.name }))) {
			user.user.removeAsFriend()
		}
	}

	const loadColleagues = () => {
		if (!WHISPEER_BUSINESS) {
			return Bluebird.resolve()
		}

		return getOwnCompanyID()
			.then((companyID) => CompanyLoader.get(companyID))
			.then((company) => {
				return userService.getMultipleFormatted(company.getUserIDs())
					.then((result: any[]) => {
						colleagues = result
						colleaguesLoading = false
					})
			})
	}

	const loadContacts = () =>
		userService.getMultipleFormatted(friendsService.getFriends())
			.then((result) => {
				contacts = result
				contactsLoading = false
			})

	const loadRequests = () =>
		userService.getMultipleFormatted(friendsService.getRequests())
			.then((result) => {
				$scope.requests = result
			})

	const load = () => {
		loadRequests()
		loadContacts()
			.then(() => loadColleagues())
	}

	friendsService.awaitLoading().then(() => {
		friendsService.listen(load)
		load()
	})

	$scope.acceptRequest = (request) => request.user.acceptFriendShip()
	$scope.ignoreRequest = (request) => request.user.ignoreFriendShip()
}

controllerModule.controller("ssn.friendsController", ["$scope", friendsController])
