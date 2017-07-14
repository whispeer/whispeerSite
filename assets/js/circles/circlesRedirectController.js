/**
* circlesRedirectController
**/

var cssService = require("services/css.service").default;

"use strict";

const circlesModule = require("circles/circlesModule");

function circlesRedirectController($scope, $rootScope, $state) {
    cssService.setClass("circlesView", true);

    function checkState() {
        var stateName = $state.current.name;
        if (stateName === "app.circles.list" && !$scope.mobile) {
            $state.go("app.circles.new");
        }

        if (stateName === "app.circles") {
            if ($scope.mobile) {
                $state.go("app.circles.list");
            } else {
                $state.go("app.circles.new");
            }
        }
    }

    checkState();

    $rootScope.$on("$stateChangeSuccess", checkState);

    $scope.$watch(function () {
        return $scope.mobile;
    }, checkState);
}

circlesRedirectController.$inject = ["$scope", "$rootScope", "$state"];

circlesModule.controller("ssn.circlesRedirectController", circlesRedirectController);
