define(['angular', 'app'], function(angular, app) {
	'use strict';

	return app.config(['$routeProvider', function($routeProvider) {
		$routeProvider.when('/login', {
			templateUrl: 'views/login/main/login.html',
			controller: 'ssn.loginController'
		});
		$routeProvider.otherwise({redirectTo: '/login'});
	}]);

});