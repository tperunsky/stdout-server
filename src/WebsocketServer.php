<?php

namespace StdoutOnline;

use Ratchet\Http\HttpServer;
use Ratchet\Server\IoServer;
use Ratchet\WebSocket\WsServer;
use React\EventLoop\Factory;
use React\Socket\SecureServer;
use React\Socket\Server;

class WebsocketServer
{
/** @var  array */
    protected $config;

    public function __construct()
    {
        $this->config = require __DIR__ . '/../config/config.php';
    }

    public function run()
    {
        $websocketHandler = new WebsocketHandler();
        $wsConf = $this->config['websocketServer'];


        $app = new HttpServer(
            new WsServer(
                $websocketHandler
            )
        );

        $loop = Factory::create();

        $secureWebsockets = new Server('0.0.0.0:' . $wsConf['port'], $loop);
        $secureWebsockets = new SecureServer($secureWebsockets, $loop, [
            'local_cert' => $wsConf['local_cert'],
            'local_pk' => $wsConf['local_pk'],
            'verify_peer' => false
        ]);

        $secureWebsocketsServer = new IoServer($app, $secureWebsockets, $loop);
        Util::log('Running wss server on port ' . $wsConf['port']);
        $secureWebsocketsServer->run();
    }
}