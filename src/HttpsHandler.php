<?php

namespace StdoutOnline;

use Exception;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Server\IoConnection;
use Throwable;
use WebSocket\Client;

class HttpsHandler
{
    /** @var  array */
    protected $config;

    /** @var  Client */
    protected $wsConnection;

    public function __construct()
    {
        $this->config = require __DIR__ . '/../config/config.php';
        $this->restartWebsocketConnection();
    }

    /**
     * @return string
     */
    protected function getMessageFromPost()
    {
        return file_get_contents("php://input");
    }

    public function onMessage()
    {
        $m = $this->getMessageFromPost();
        $m = rtrim($m); // trim trailing whitespace
        $attempts = 3;

        while (true) {
            try {
                $this->wsConnection->send($m);
                break;
            } catch (Throwable $e) {
                Util::log('Error while sending message.');
                Util::log('Restarting connection. Remaining attempts: ' . $attempts);
                $this->restartWebsocketConnection();
                $attempts--;
                if ($attempts <= 0) {
                    throw $e;
                }
            }
        }
    }

    protected function restartWebsocketConnection()
    {
        $wsConf = $this->config['websocketServer'];
        $this->wsConnection = new Client(
            "wss://{$wsConf['host']}:{$wsConf['port']}",
            ['timeout' => $wsConf['timeout']]
        );
    }
}