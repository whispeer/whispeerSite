"use strict";
const angular = require("angular");
require("directives/savebutton");
require("directives/mobile");
require("runners/promiseRunner");
module.exports = angular.module("ssn.verifyMail", ["ssn.directives", "ssn.runners"]);
