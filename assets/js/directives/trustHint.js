var ENABLE_TRUST_HINTS = false;

"use strict";
const directivesModule = require("directives/directivesModule");
require("jquery");
require("qtip");
var directive =  function(localize) {
	return {
		restrict: "A",
		link: function(scope, elm) {
			if (!ENABLE_TRUST_HINTS) {
				return;
			}
            
			if (!scope.userData || scope.userData.me) {
				return;
			}

			var translation = "";
			switch(scope.userData.trustLevel) {
			case -1:
				translation = "deleted";
				break;
			case 0:
				translation = "unVerified";
				break;
			case 1:
				translation = "groupVerified";
				break;
			case 2:
				translation = "selfVerified";
				break;
			default:
				break;
			}

			elm.qtip({
				content: {
					text: localize.getLocalizedString("trustLevel." + translation)
				},
				style: {
					classes: "qtip-bootstrap"
				},
				position: {
					my: "top center",
					at: "bottom center"
				}
			});

			elm.mouseover(function () {
				if (!scope.userData || scope.userData.me) {
					return;
				}

				elm.qtip("show");
			});

			elm.mouseout(function () {
				elm.qtip("hide");
			});

			scope.$on("$destroy", function() {
				elm.qtip("destroy", true);
			});
		}
	};
};

directive.$inject = ["localize"];

directivesModule.directive("trustHint", directive);
