<?php

namespace StdoutOnline;

use DateTime;

class Util
{
    /**
     * Logs $msg with a simple echo. Used for debugging.
     * @param $msg
     */
    public static function log($msg)
    {
         echo '[' . (new DateTime())->format('Y-m-d H:i:s T') . ']: ' . $msg . PHP_EOL;
    }

    public static function setUpCleanDeath()
    {
        $killSignals = [
            'SIGINT' => SIGINT,
            'SIGTERM' => SIGTERM,
            'SIGQUIT' => SIGQUIT,
        ];

        foreach ($killSignals as $sName => $sNumber) {
            pcntl_signal($sNumber, function () use ($sName) {
                Util::log('Received ' . $sName . ' signal. Terminating.');
                exit();
            });
        }

    }
}