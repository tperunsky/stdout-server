<?php

namespace StdoutOnline;

use Exception;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Server\IoConnection;
use Throwable;
use WebSocket\Client;

class TcpHandler implements MessageComponentInterface
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
     * Triggered when a message is received on an existing connection
     * @param ConnectionInterface $conn
     * @param string $m
     * @throws Throwable
     */
    public function onMessage(ConnectionInterface $conn, $m)
    {
        /** @var $conn IoConnection */
        /** @var $client IoConnection */

        if ($this->isTelnetActiveNegotiationSequence($m)) {
            return; //skip Telnet control sequence gibberish
        }

        $m = rtrim($m); //trim trailing whitespace

        //Uncomment only for debugging
//        Util::log(sprintf(
//            'Connection %d from %s sending message "%s" to WebSocket server',
//            $conn->resourceId,
//            $conn->remoteAddress,
//            $m
//        ));

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

    /**
     * Triggered when a new TCP connection is opened. This method is implemented only for debugging purposes
     * @param ConnectionInterface $conn
     */
    public function onOpen(ConnectionInterface $conn)
    {
        Util::log('New connection: ' . $conn->resourceId . ' from ' . $conn->remoteAddress);
    }

    /**
     * Triggered when an existing TCP connection is closed. This method is implemented only for debugging purposes
     * @param ConnectionInterface $conn
     */
    public function onClose(ConnectionInterface $conn)
    {
        Util::log('Connection ' . $conn->resourceId . ' from ' . $conn->remoteAddress . ' has been closed');
    }

    /**
     * Triggered when there's an error
     * @param ConnectionInterface $conn
     * @param Exception $e
     */
    public function onError(ConnectionInterface $conn, Exception $e)
    {
        /** @var $conn IoConnection */
        Util::log('An error has occurred for connection ' . $conn->resourceId . ' from ' . $conn->remoteAddress);
        Util::log($e->getMessage());

        $conn->close();
    }

    /**
     * In PuTTY, Telnet sessions with active negotiation mode start with a special 21 byte sequence of gibberish.
     * This method returns true if $m matches this 21 byte sequence and false otherwise.
     * see https://stackoverflow.com/questions/22908008/telnet-session-starts-with-21-bytes-of-crap
     *
     * @param string $m
     * @return bool
     */
    protected function isTelnetActiveNegotiationSequence($m)
    {
        return '//sf//sg//sY//sn//0B//sD//0D' === base64_encode($m);
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