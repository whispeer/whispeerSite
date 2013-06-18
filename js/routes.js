define(['angular', 'app'], function(angular, app) {
	'use strict';

	return app.config(['$routeProvider', function($routeProvider) {
		/** login and register */
		$routeProvider.when('/login', {
			templateUrl: 'views/login/login.html',
			controller: 'ssn.loginController'
		});

		/** after login */
		$routeProvider.when('/main', {
			templateUrl: 'views/main/main.html',
			controller: 'ssn.mainController'		
		});
		$routeProvider.when('/user/:userid', {
			templateUrl: 'views/user/user.html',
			controller: 'ssn.userController'		
		});
		$routeProvider.when('/:identifier', {
			redirectTo: function (params) {
				return '/user/' + params["identifier"]	;
			}
		});
		$routeProvider.otherwise({redirectTo: '/login'});
	}]);

});