"use strict";
const directivesModule = require('directives/directivesModule');
function scrollToIDDirective() {
    return {
        restrict: "A",
        link: function(scope, iElement, iAttrs) {
            iElement.click(function () {
                var elm, hash = iAttrs.scrolltoid;

                if ((elm = document.getElementById(hash))) {
                    elm.scrollIntoView();
                }
            });
        }
    };
}
scrollToIDDirective.$inject = ["$location", "$anchorScroll"];
scrollToIDDirective.$name = "scrolltoid";

directivesModule.directive("scrolltoid", scrollToIDDirective);
