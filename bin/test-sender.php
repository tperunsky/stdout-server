<?php
$start = microtime(true);

for($i=0;$i<10;$i++) {
    $fp = stream_socket_client("tcp://localhost:10660", $errno, $errstr, 10);
    if (!$fp) {
        echo "$errstr ($errno)<br />\n";
    } else {
        $sendData = [
            's' => 123,
            'm' => 'Current time: ' . microtime(true)
        ];

        fwrite($fp, json_encode($sendData));
        fclose($fp); // To close the connection
    }
}


echo $i . " requests took: " . ((microtime(true) - $start) * 1000) . 'ms';