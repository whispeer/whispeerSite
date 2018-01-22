import * as Bluebird from "bluebird"
import socketService from "../services/socket.service"
import sessionService from "../services/session.service"

import UserLoader from "./user"

const sjcl = require("sjcl")
const initService = require("services/initService")

function loadUser(identifier) {
	return UserLoader.get(identifier)
}

const userService = {
	/** search your friends */
	queryFriends: function (query) {
		return Bluebird.try(function () {
			return socketService.emit("user.searchFriends", {
				text: query,
				known: []
			})
		}).then((data) => {
			return data.results
		}).map((user: any) => {
			return UserLoader.load(user)
		})
	},

	/** search for a user
	* @param query query string to search for
	* @param cb user objects
	*/
	query: function (query, cb) {
		return initService.awaitLoading().then(function () {
			return socketService.definitlyEmit("user.search", {
				text: query,
				known: []
			})
		}).then((data) => {
			return data.results
		}).map((user) => {
			return UserLoader.load(user)
		}).nodeify(cb)
	},

	/** load a user
	* @param identifier identifier of the user (id, nickname or mail)
	* @param cb called with results
	* this function is asynchronous and returns immediatly. requests are also batched.
	*/
	get: function (identifier, cb?) {
		return loadUser(identifier).nodeify(cb)
	},

	/** load a user
	* @param identifiers identifier array of the users (id, nickname or mail)
	* @param cb called with results
	* this function is asynchronous and returns immediatly. requests are also batched.
	*/
	getMultiple: function (identifiers, cb?) {
		return Bluebird.resolve(identifiers).map(function (id) {
			return loadUser(id)
		}).nodeify(cb)
	},

	/** gets multiple users and loads their basic data.
	* @param identifiers identifier of users to load
	* @param cb called with users data.
	*/
	getMultipleFormatted: function (identifiers, cb?) {
		return Bluebird.try(function () {
			return userService.getMultiple(identifiers)
		}).map(function (user: any) {
			return user.loadBasicData().thenReturn(user)
		}).then(function (users) {
			return users.map(function (user) {
				return user.data
			})
		}).nodeify(cb)
	},

	/** get own user. synchronous */
	getOwn: () => UserLoader.getLoaded(sessionService.getUserID()),

	getOwnAsync: () => UserLoader.get(sessionService.getUserID())
}

initService.registerCallback(function () {
	return UserLoader.get(sessionService.getUserID()).catch(function (e) {
		if (e instanceof sjcl.exception.corrupt) {
			alert("Password did not match. Logging out")
			sessionService.logout()
			return new Bluebird(function () {})
		}

		return Bluebird.reject(e)
	})
})

export default userService
