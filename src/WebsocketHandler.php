<?php

namespace StdoutOnline;

use function count;
use Exception;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Server\IoConnection;
use SplObjectStorage;

class WebsocketHandler implements MessageComponentInterface
{
    /**
     * Registered connections
     * @var SplObjectStorage[]
     */
    protected $regConn;

    /**
     * Unregistered connections
     * @var SplObjectStorage
     */
    protected $unregConn;

    public function __construct()
    {
        $this->regConn = [];
        $this->unregConn = new SplObjectStorage;
    }

    /**
     * @param ConnectionInterface $conn
     */
    public function onOpen(ConnectionInterface $conn)
    {
        /** @var IoConnection $conn */
        $this->unregConn->attach($conn);

        Util::log('New connection: ' . $conn->resourceId);
    }

    /**
     * @param ConnectionInterface $from
     * @param string $m
     */
    public function onMessage(ConnectionInterface $from, $m)
    {
        if (strpos($m, 'StdoutOnline-Register-Session') === 0) {
            $this->registerConnection($from, $m);
        } else {
            $decodedMsg = json_decode($m, true);
            if ($this->isMessageValid($decodedMsg)) {
                $this->forwardMessage($from, $decodedMsg);
            }
        }
    }

    /**
     * @param array $decodedMsg
     * @return bool
     */
    protected function isMessageValid($decodedMsg) : bool
    {
        if (empty($decodedMsg['s']) || empty($this->regConn[$decodedMsg['s']])) {
            Util::log('Invalid session id supplied');
            return false;
        }

        if (!isset($decodedMsg['m'])) {
            Util::log('Missing message payload');
            return false;
        }

        return true;
    }

    /**
     * @param ConnectionInterface $from
     * @param array $decodedMsg
     */
    protected function forwardMessage($from, $decodedMsg)
    {
        $recipients = $this->regConn[$decodedMsg['s']] ?: [];
        $messagePayload = json_encode($decodedMsg['m']);

        /** @var IoConnection $from */
        /** @var IoConnection $client */

        //Uncomment only for debugging
//        $recipientCount = count($recipients);
//        Util::log(sprintf(
//            'Connection %d sending message "%s" to %d other connection%s for session %s',
//            $from->resourceId,
//            $messagePayload,
//            $recipientCount,
//            $recipientCount === 1 ? '' : 's',
//            $decodedMsg['s']
//        ));

        foreach ($recipients as $client) {
            if ($from !== $client) {
                $client->send($messagePayload);
            }
        }
    }

    /**
     * @param ConnectionInterface $conn
     */
    public function onClose(ConnectionInterface $conn)
    {
        /** @var IoConnection $conn */
        Util::log("Connection {$conn->resourceId} has disconnected");

        $this->unsetConnection($conn);
    }

    /**
     * @param ConnectionInterface $conn
     * @param Exception $e
     */
    public function onError(ConnectionInterface $conn, Exception $e)
    {
        /** @var IoConnection $conn */
        Util::log("An error has occurred: {$e->getMessage()}");

        $this->unsetConnection($conn);
        $conn->close();
    }

    /**
     * @param ConnectionInterface $from
     * @param string $m
     */
    protected function registerConnection($from, $m)
    {
        $sessionId = explode(' ', $m, 2)[1];
        if ($this->unregConn->contains($from)) {
            $this->regConn[$sessionId] = $this->regConn[$sessionId] ?? new SplObjectStorage();
            $this->regConn[$sessionId]->attach($from);
            $this->unregConn->detach($from);
            Util::log('Connection is now registered with session id ' . $sessionId);
        } else {
            Util::log('Connection is already registered with session id '  . $sessionId);
        }
    }

    /**
     * @param ConnectionInterface $conn
     */
    protected function unsetConnection($conn)
    {
        $this->unregConn->detach($conn);
        foreach ($this->regConn as $sessionConnections) {
            $sessionConnections->detach($conn);
        }
    }
}