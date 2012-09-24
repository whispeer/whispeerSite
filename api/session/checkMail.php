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
	
	if (array_key_exists("mail", $_GET)) {
		$mail = $_GET["mail"];
	} else {
		$mail = "";
	}

	if (session::getInstance()->checkMailUsed($mail)) {
		json::inst()->addValue("mailUsed", 1);
	} else {
		json::inst()->addValue("mailUsed", 0);
	}

	if (helper::checkMail($mail)) {
		json::inst()->addValue("mailValid", 1);
	} else {
		json::inst()->addValue("mailValid", 0);
	}

	json::inst()->doprint();
?>