var cssService = require("services/css.service").default;

"use strict";

const controllerModule = require('controllers/controllerModule');

function searchController($scope, $state) {
    cssService.setClass("searchView", true);

    $scope.visitUserProfile = function (user) {
        $state.go("app.user.info", {
            identifier: user.user.getNickname()
        });
        $scope.closeSidebar();
    };
}

searchController.$inject = ["$scope", "$state"];

controllerModule.controller("ssn.searchController", searchController);
