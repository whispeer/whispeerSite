var circleService = require("circles/circleService");

"use strict";
const angular = require('angular');
const Promise = require('bluebird');

module.exports = function () {
    angular.module("ssn.search").factory("circleSearchSupplier", [function () {
        var Search = function () {};

        Search.prototype.search = function (query) {
            var action = Promise.promisify(circleService.loadAll.bind(circleService));

            return action().bind(this).then(function () {
                var circles = circleService.data.circles;

                if (query === "") {
                    return circles;
                }

                return circles.filter(function (circle) {
                    return circle.name.toLowerCase().indexOf(query.toLowerCase()) > -1;
                });
            });
        };

        return Search;
    }]);
};
