"use strict";

const angular = require("angular");
const filterSearchSupplier = require("search/filterSearchSupplier");
const userSearchSupplier = require("search/userSearchSupplier");
const circleSearchSupplier = require("search/circleSearchSupplier");
const friendsSearchSupplier = require("search/friendsSearchSupplier");

angular.module("ssn.search", []);

filterSearchSupplier()
userSearchSupplier()
circleSearchSupplier()
friendsSearchSupplier()
