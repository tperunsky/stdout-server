<?php

namespace StdoutOnline;

use Ratchet\Server\IoServer;

class TcpServer
{
    /** @var  array */
    protected $config;

    public function __construct()
    {
        $this->config = require __DIR__ . '/../config/config.php';
    }

    public function run()
    {
        $tcpHandler = new TcpHandler();
        $tcpConf = $this->config['tcpServer'];

        $server = IoServer::factory(
            $tcpHandler,
            $tcpConf['port']
        );

        Util::log('Running tcp server on port ' . $tcpConf['port']);
        $server->run();
    }
}