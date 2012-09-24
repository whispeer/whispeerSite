<?php
	define("ssn", 1);

	require_once("main.php");

	loadClass("session");
	loadClass("helper");
	loadClass("json");
	loadClass("user");
	loadClass("handler");

	json::inst()->addValue("logedin", 0);

	logError($_POST["data"]);

	if (isset($_POST["data"])) {
		$data = json_decode(stripslashes($_POST["data"]), true);
		
		if (isset($data["sid"])) {
			if (session::getInstance($data["sid"])->logedin()) {
				json::inst()->addValue("logedin", 1);

				handler::handle($data);
			}

			unset($data["sid"]);
		}
	}

	json::inst()->doprint();
?>