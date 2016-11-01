// BASIC SETUP
var express = require('express');
 	app     = express(),
 	port    = process.env.PORT || 8083,
 	http    = require('http').Server(app),
	UUID    = require('node-uuid'),
 	io      = require('socket.io')(http);

// ROUTES
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

app.use(express.static(__dirname + '/public'));

game_server = require('./src/server.js');

io.on('connection', function (client) {

	client.userid = UUID();
    client.emit('connected', {"id": client.userid})

    console.log('   :: socket.io :: player ' + client.userid + ' connected');

	   client.on('message', function(m) {

            game_server.onMessage(client, m);

        });

	client.on('disconnect', function () {

        console.log('   :: socket.io :: client disconnected ' + client.userid);

        if(client.game && client.game.id) {
            game_server.endGame(client.game.id, client.userid, 'disconnect');
        }
    });
});

// START THE SERVER
http.listen(port);

console.log('   :: Express :: Listening on port ' + port );
