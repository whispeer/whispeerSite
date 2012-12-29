<?php
	$json = file_get_contents('php://input');

	$json = $json . "\n";
	// log or mail $msg now

	file_put_contents("violation.log", $json, FILE_APPEND | LOCK_EX);
?>