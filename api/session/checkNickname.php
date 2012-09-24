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
	
	if (array_key_exists("nickname", $_GET)) {
		$nickname = $_GET["nickname"];
	} else {
		$nickname = "";
	}

	if (session::getInstance()->checkNicknameUsed($nickname)) {
		json::inst()->addValue("nicknameUsed", 1);
	} else {
		json::inst()->addValue("nicknameUsed", 0);
	}

	if (helper::checkNickname($nickname)) {
		json::inst()->addValue("nicknameValid", 1);
	} else {
		json::inst()->addValue("nicknameValid", 0);
	}

	json::inst()->doprint();
?>