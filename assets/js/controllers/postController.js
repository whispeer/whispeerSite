/**
* postController
**/

var cssService = require("services/css.service").default;
var errorService = require("services/error.service").errorServiceInstance;
var postService = require("services/postService");

"use strict";

const Bluebird = require('bluebird');
const State = require('asset/state');
const controllerModule = require('controllers/controllerModule');

function postController($scope, $stateParams) {
    cssService.setClass("mainView");

    function loadPost(postID) {
        return postService.getPostByID(postID).then(function (post) {
            $scope.post = post.data;

            return post.loadData();
        }).catch(errorService.criticalError);
    }

    loadPost($stateParams.postID);
}

postController.$inject = ["$scope", "$stateParams"];

controllerModule.controller("ssn.postController", postController);
