define(function () {
  "use strict";
  function scrollTo() {
    return {
      restrict: "A",
      scope: {
        anchorName: "@smoothScroll"
      },
      link: function(scope, iElement) {
        iElement.click(function () {
          var target = jQuery("[name=" + scope.anchorName + "]");

          if (target.length) {
            jQuery("html,body").animate({
              scrollTop: target.offset().top
            }, 1000);
          }
        });
      }
    };
  }
  return scrollTo;
});
