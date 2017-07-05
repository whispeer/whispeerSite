/**
* messagesController
**/

var messageService = require("messages/messageService");

"use strict";

const jQuery = require('jquery');
const h = require("whispeerHelper").default;
const State = require('asset/state');
const Bluebird = require('bluebird');
const controllerModule = require('controllers/controllerModule');

function messagesController($scope, $state, $stateParams, $element) {
    $scope.topics = messageService.data.latestTopics.data;

    var topicsLoadingState = new State.default();
    $scope.topicsLoadingState = topicsLoadingState.data;

    var loadMoreTopics = Bluebird.promisify(messageService.loadMoreLatest.bind(messageService));

    function loadTopics() {
        if (messageService.data.latestTopics.allTopicsLoaded) {
            return;
        }

        if (topicsLoadingState.isPending()) {
            return;
        }

        topicsLoadingState.pending();
        return loadMoreTopics().then(function () {
            topicsLoadingState.success();
        }).catch(function () {
            topicsLoadingState.failed();
        });
    }

    function loadMoreUntilFull() {
        if (messageService.data.latestTopics.allTopicsLoaded) {
            return;
        }

        Bluebird.delay(500).then(function () {
            var scroller = $element.find("#topicListWrap");

            var outerHeight = scroller.height();
            var innerHeight = 0;
            scroller.children().each(function(){
                innerHeight = innerHeight + jQuery(this).outerHeight(true);
            });

            if (outerHeight > innerHeight) {
                return $scope.loadMoreTopics().then(function () {
                    loadMoreUntilFull();
                });
            }
        });
    }

    loadMoreUntilFull();

    $scope.loadMoreTopics = function () {
        return loadTopics();
    };

    $scope.isActiveTopic = function (topic) {
        return (messageService.isActiveTopic(parseInt(topic.id, 10)));
    };

    $scope.shortenMessage = function (string) {
        if (!string) {
            return "";
        }

        if(string.length > 100) {
            return string.substr(0, 97) + "...";
        } else {
            return string;
        }
    };
}


messagesController.$inject = ["$scope", "$state", "$stateParams", "$element"];

controllerModule.controller("ssn.messagesListController", messagesController);
