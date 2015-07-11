#!/usr/bin/env nodejs

var ws = require('ws');

var settings = {
    port: 3000
};

var wss = new ws.Server({
    port: settings.port
});

wss.broadcast = function(data) {
    var i;
    for(i=0; i < this.clients.length; i++) {
        this.clients[i].send(data);
    }
};

wss.on('connection', function(con) {
    con.on('message', function(message) {
        console.log('received: %s', message);
        wss.broadcast(message);
    });
});

console.log("Server started on port", settings.port);
