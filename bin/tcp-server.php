<?php

use StdoutOnline\TcpServer;
use StdoutOnline\Util;

require dirname(__DIR__) . '/vendor/autoload.php';

try {
    Util::setUpCleanDeath();
    $tcpServer = new TcpServer();
    $tcpServer->run();
} catch (Exception $e) {
    Util::log('Exception: ' . $e->getMessage() . PHP_EOL . $e->getTraceAsString());
} catch (Error $e) {
    Util::log('Error: ' . $e->getMessage() . PHP_EOL . $e->getTraceAsString());
}
