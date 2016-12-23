(function() {
	"use strict";

	var api = "";
	var form = document.getElementById("mail_signup");

	form.addEventListener("submit", function(event) {
		event.preventDefault();

		if(event.srcElement.checkValidity()) {
			var data = {
				"name": document.getElementById("signup_name").value,
				"mail": document.getElementById("signup_mail").value
			};

			document.getElementById("account_teaser").classList.add("fade-out");

			event.srcElement.classList.add("fade-out");

			document.getElementById("mail_signup-after-send").classList.add("fade-in");

			var req = new XMLHttpRequest();

			req.open("POST", api, true);

			req.onreadystatechange = function() {
				if(req.readyState != 4 || req.status != 200) return;

				debugger;

				document.getElementById("mail_signup-after-send__loading").classList.add("hide");
				document.getElementById("mail_signup-after-send__finished").classList.remove("hide");
			};

			req.send(JSON.stringify(data));
		}

		return false;
	});
})();