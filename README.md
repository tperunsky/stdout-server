This is the server part of the stdout.online app. The idea behind this app is to be able to log text from anywhere with 
no previous setup. The resulting log messages are viewable in real time in the browser. 

Installation
- composer install
- create `/config/config.php` based on `/config/config.php.dist`


Current layout
- tcp-server.php - TCP server accepting text log messages. It passes these messages to the WebSocket server.
- ws-server.php - WebSocket server which automatically registers log message consumers based on session id and feeds log 
                  messages received from TCP server to them (a consumer is typically a web browser running stdout-ui)
- test-sender.php - A simple script which generates a bunch of test log messages. 

In short, messages are routed like this: 
Client (test-sender.php or any other program) -> TCP server (tcp-server.php) -> WebSocket server (ws-server.php) -> Browser ([stdout-ui](https://github.com/tperunsky/stdout-ui))

To test, run 
`php tcp-server.php`
`php ws-server.php`
and open the stdout-ui app in a browser. You may want to set up a virtual host for this - for example 
`http://stdout-online.local?id=123`. Note the `?id=123` part - 123 is the session id used by the test-sender.php  

At this point everything is ready to accept and display messages. 
Run `php test-sender.php`. You should see log messages in the browser.

You can also send messages to the TCP server using telnet - for example 
{"s":123, "m": "Hello World"} 
On Windows, you can use PuTTY. In settings, set Terminal -> Local line editing to "Force on" to be able to send messages with enter 
