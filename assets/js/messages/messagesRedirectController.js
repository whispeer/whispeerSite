/**
* messagesController
**/

var cssService = require("services/css.service").default;

"use strict";

const messagesModule = require('messages/messagesModule');

function messagesController($scope, $rootScope, $state) {
    cssService.setClass("messagesView", true);

    function checkState() {
        var stateName = $state.current.name;
        if (stateName === "app.messages.list" && !$scope.mobile) {
            $state.go("app.messages.start");
        }

        if (stateName === "app.messages") {
            if ($scope.mobile) {
                $state.go("app.messages.list");
            } else {
                $state.go("app.messages.start");
            }
        }
    }

    checkState();

    $rootScope.$on("$stateChangeSuccess", checkState);

    $scope.$watch(function () {
        return $scope.mobile;
    }, checkState);
}

messagesController.$inject = ["$scope", "$rootScope", "$state"];

messagesModule.controller("ssn.messagesRedirectController", messagesController);
