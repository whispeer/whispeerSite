/**
* setupController
**/

var errorService = require("services/error.service").errorServiceInstance;
var messageService = require("messages/messageService");

"use strict";

const h = require('whispeerHelper');
const State = require('asset/state');
const Bluebird = require('bluebird');
const messagesModule = require('messages/messagesModule');

function messagesDetailController($scope, $element, $state, $stateParams) {
    var topicLoadingState = new State.default();
    $scope.topicLoadingState = topicLoadingState.data;

    topicLoadingState.pending();

    var topicID = h.parseDecimal($stateParams.topicid);

    var topicDetailsSavingState = new State.default();
    $scope.topicDetailsSavingState = topicDetailsSavingState.data;

    $scope.saveTitle = function () {
        topicDetailsSavingState.pending();

        var savePromise = $scope.activeTopic.obj.setTitle($scope.topicTitle).then(function () {
            $state.go("app.messages.show", { topicid: topicID });

            return null;
        });

        errorService.failOnErrorPromise(topicDetailsSavingState, savePromise);
    };

    $scope.topicTitle = "";

    var getTopicPromise = messageService.getTopic(topicID).then(function (topic) {
        messageService.setActiveTopic(topicID);
        $scope.activeTopic = topic.data;

        $scope.topicTitle = topic.data.title || "";
    });

    errorService.failOnErrorPromise(topicLoadingState, getTopicPromise);
}

messagesDetailController.$inject = ["$scope", "$element", "$state", "$stateParams"];

messagesModule.controller("ssn.messagesDetailController", messagesDetailController);
