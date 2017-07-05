"use strict";
const angular = require('angular');
require('search/filterSearchSupplier');
require('search/userSearchSupplier');
require('search/circleSearchSupplier');
require('search/friendsSearchSupplier');
angular.module("ssn.search", []);

var i;
for (i = 1; i < arguments.length; i += 1) {
    arguments[i]();
}
