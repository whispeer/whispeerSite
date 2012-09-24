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

if (array_key_exists("sid", $_POST)) {
	$sid = $_POST["sid"];
} else {
	$sid = "";
}

if (session::getInstance($sid)->logedin()) {
	json::inst()->addValue("sessionok", 1);
} else {
	json::inst()->addValue("sessionok", 0);
}

json::inst()->doprint();

?>