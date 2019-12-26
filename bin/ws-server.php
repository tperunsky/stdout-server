<?php

use StdoutOnline\WebsocketServer;
use StdoutOnline\Util;

require dirname(__DIR__) . '/vendor/autoload.php';

try {
    Util::setUpCleanDeath();
    $websocketServer = new WebsocketServer();
    $websocketServer->run();
} catch (Exception $e) {
    Util::log('Exception: ' . $e->getMessage() . PHP_EOL . $e->getTraceAsString());
} catch (Error $e) {
    Util::log('Error: ' . $e->getMessage() . PHP_EOL . $e->getTraceAsString());
}
