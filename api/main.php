<?php

/**
 (C) Nils Kenneweg 2012
 Do not copy or distribute.
*/

if(!defined("ssn")) {
	die("no access");
}

function exception_error_handler($errno, $errstr, $errfile, $errline)
{
    if (error_reporting() === 0)
    {
        return;
    }

	die_error($errstr, $errno, $errfile, $errline);
}

set_error_handler("exception_error_handler");

function catchException($exception)
{
    // these are our templates
    $traceline = "#%s %s(%s): %s(%s)";
    $msg = "PHP Fatal error:  Uncaught exception '%s' with message '%s' in %s:%s\nStack trace:\n%s\n  thrown in %s on line %s";

    // alter your trace as you please, here
    $trace = $exception->getTrace();
    foreach ($trace as $key => $stackPoint) {
        // I'm converting arguments to their type
        // (prevents passwords from ever getting logged as anything other than 'string')
        $trace[$key]['args'] = array_map('gettype', $trace[$key]['args']);
    }

    // build your tracelines
    $result = array();
    foreach ($trace as $key => $stackPoint) {
        $result[] = sprintf(
            $traceline,
            $key,
            $stackPoint['file'],
            $stackPoint['line'],
            $stackPoint['function'],
            implode(', ', $stackPoint['args'])
        );
    }
    // trace always ends with {main}
    $result[] = '#' . ++$key . ' {main}';

    // write tracelines into main template
    $msg = sprintf(
        $msg,
        get_class($exception),
        $exception->getMessage(),
        $exception->getFile(),
        $exception->getLine(),
        implode("\n", $result),
        $exception->getFile(),
        $exception->getLine()
    );

    // log or echo as you please
    die_error($msg);
}

set_exception_handler('catchException');

function logTrace() {
	$traceline = "#%s %s(%s): %s(%s)";
	try {
		throw new Exception();
	} catch (Exception $exception) {
		$trace = $exception->getTrace();
		foreach ($trace as $key => $stackPoint) {
			// I'm converting arguments to their type
			// (prevents passwords from ever getting logged as anything other than 'string')
			$trace[$key]['args'] = array_map('gettype', $trace[$key]['args']);
		}

		// build your tracelines
		$result = array();
		foreach ($trace as $key => $stackPoint) {
			$result[] = sprintf(
				$traceline,
				$key,
				(isset($stackPoint['file'])?$stackPoint['file']:""),
				(isset($stackPoint['line'])?$stackPoint['line']:""),
				(isset($stackPoint['function'])?$stackPoint['function']:""),
				implode(', ', $stackPoint['args'])
			);
		}
		// trace always ends with {main}
		$result[] = '#' . ++$key . ' {main}';

		logError(implode("\n", $result));
	}
}

function logError($error) {
	$errorpath = dirname(__FILE__);
	$errorpath = realpath($errorpath . "/../../log/");
	
	$error = $error ."\n";
	
	if ($errorpath == "") {
		die('{"status":0,"fatalError":1}');
	}
	
	file_put_contents($errorpath . "/log.txt", $error, FILE_APPEND);
}

function die_error($error, $errno = "", $errfile = "", $errline = "") {
	dieError($error, $errno, $errfile, $errline);
}

function dieError($error, $errno = "", $errfile = "", $errline = "") {
	if ($errfile != "") {
		$errorOutput = $error ." (".$errfile.":".$errline.") [". $errno ."]";
	} else {
		$errorOutput = $error;
	}
	
	logError($errorOutput);
	logTrace();
	
	die('{"status":0}');
}

function loadClass($className) {
	$classpath = dirname(__FILE__);
	$classpath = realpath($classpath . "/../../include/");
	
	if ($classpath == "") {
		die_error("Could not find include path - ".dirname(__FILE__)."/../../include/");
	}
	
	if (file_exists($classpath."/".$className.".class.php")) {
		require_once($classpath."/".$className.".class.php");
	} else {
		die_error("Class not found ".$className." - ".$classpath." - ". dirname(__FILE__));
	}
}

loadClass("exceptions");

?>
