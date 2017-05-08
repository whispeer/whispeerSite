var angular = require("angular")

require("i18n/localizationConfig")
require("directives/savebutton");
require("runners/promiseRunner")
require("localizationModule")

module.exports = angular.module("ssn.recovery", ["ssn.directives", "ssn.runners", "localization"]);
