<?php

use StdoutOnline\HttpsHandler;

require dirname(__DIR__) . '/vendor/autoload.php';

try {
    $httpsHandler = new HttpsHandler();
    $httpsHandler->onMessage();
} catch (Throwable $t) {
    error_log($t->getMessage() . ' - ' . $t->getTraceAsString());
}
