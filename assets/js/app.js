var context = require.context(
	"../../assets/views/", // context folder
	true, // include subdirectories
	/.*\.html/ // RegExp
);

context.keys().forEach(context);

require("interceptors/addKeysInterceptor");
require("interceptors/sessionServiceInterceptor");

"use strict";

const angular = require('angular');
const config = require('config');
require('angularUiRouter');
require('controllers/controllers');
require('runners/runners');
require('filter/filter');
require('directives/directives');
require('messages/messagesLoader');
require('circles/circlesLoader');
require('user/userLoader');
require('search/loader');
require('models/models');
require('localizationModule');
require('emptyInclude');

module.exports = angular.module("ssn", [
    "ssn.controllers",
    "ssn.models",
    "ssn.services",
    "ssn.directives",
    "ssn.filter",
    "ssn.search",
    "ssn.runners",
    "ssn.messages",
    "ssn.circles",
    "ssn.user",

    "localization",
    "ui.router",
    "ngTouch"
], ["$compileProvider", function ($compileProvider) {
    $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|file|blob|app):|data:image\//);
    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|file|app):/);

    if (!config.debug) {
        $compileProvider.debugInfoEnabled(false);
    }
}]);
