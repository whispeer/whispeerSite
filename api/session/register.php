<?php
/**
 (C) Nils Kenneweg 2012
 Do not copy or distribute.
*/

	define("ssn", 1);
	
	require_once("../main.php");
	
	loadClass("session");
	loadClass("helper");
	loadClass("json");
	
	if (isset($_POST["data"])) {
		echo session::getInstance()->register($_POST["data"]);
	} else {
		die('{"status":0}');
	}
?>