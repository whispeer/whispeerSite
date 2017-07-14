/**
* userController
**/

var userService = require("user/userService");

"use strict";

const Bluebird = require("bluebird");
const Promise = require("bluebird");
const ResizableImage = require("asset/resizableImage");
const State = require("asset/state");
const userModule = require("user/userModule");

function userFriendsController($scope, $stateParams) {
    var identifier = $stateParams.identifier;

    $scope.loadingFriends = true;

    userService.get(identifier).then(function (user) {
        return user.getFriends();
    }).then(function (friends) {
        return userService.getMultiple(friends);
    }).then(function (friends) {
        var i;
        $scope.friends = [];
        var parallel = [];

        for (i = 0; i < friends.length; i += 1) {
            $scope.friends.push(friends[i].data);
            parallel.push(friends[i].loadBasicData());
        }

        return Bluebird.all(parallel);
    }).then(function () {
        $scope.loadingFriends = false;
    });

    $scope.friends = [];
}

userFriendsController.$inject = ["$scope", "$stateParams"];

userModule.controller("ssn.userFriendsController", userFriendsController);
