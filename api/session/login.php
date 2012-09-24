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

if (array_key_exists("data", $_POST)) {
	$data = $_POST["data"];
} else {
	json::inst()->addValue("status", 1);
	json::inst()->addValue("loginok", 0);
	json::inst()->addValue("nodata", 1);
	json::inst()->doprint();
	die();
}

$data = json_decode(stripslashes($data), true);

if ($data["password"]) {
	if(session::getInstance()->loginPW($data["identifier"], $data["password"])) {
		json::inst()->addValue("loginok", 1);
		json::inst()->addValue("session", session::getInstance()->sid());
		json::inst()->addValue("mainKey", session::getInstance()->getOwnUser()->getMainKey());
		if (session::getInstance()->getOwnUser()->hasPrivateKey()) {
			json::inst()->addValue("key", session::getInstance()->getOwnUser()->getPrivateKey());
		}
	} else {
		json::inst()->addValue("loginok", 0);
	}
} else {
	//TODO: Login with signing (Low priority)
}

json::inst()->doprint();

?>