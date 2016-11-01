var UUID        = require('node-uuid');

//Since we are sharing code with the browser, we
//are going to include some values to handle that.
global.window = global.document = global;

var frame_time = 45; //on server we run at 45ms

( function () {

    var lastTime = 0;

    if ( !window.requestAnimationFrame ) {
        window.requestAnimationFrame = function ( callback, element ) {
            var currTime = Date.now()
            var timeToCall = Math.max( 0, frame_time - ( currTime - lastTime ) );
            var id = window.setTimeout( function() { callback( currTime + timeToCall ); }, timeToCall );
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    if ( !window.cancelAnimationFrame ) {
        window.cancelAnimationFrame = function ( id ) { clearTimeout( id ); };
    }

}() );

var game_core = require('./game_core.js')

var game_server = {
    games : {},
    game_count:0,
    onMessage(client,message) {
            //Cut the message up into sub components
        var message_parts = message.split('.');
            //The first is always the type of message
        var message_type = message_parts[0];

        if(message_type == 'i') {
                //Input handler will forward this
            var input_commands = message_parts[1].split('-');
        	var input_seq = message_parts[2];

            //the client should be in a game, so
            //we can tell that game to handle the input
        	if(client && client.game && client.game.gamecore) {
            	client.game.gamecore.server_handle_input(client, input_commands, input_seq);
            }
        } else if (message_type == 'p') {
            client.send('s.p.' + message_parts[1]);
        } else if (message_type == 'f') {
            //client is trying to find game
            client.nickname = message_parts[1];
           client.emit('finding game', { id: client.userid, nickname: client.nickname });
           console.log('   :: game_server :: player ' + client.userid + ' is ' + client.nickname);
           this.findGame(client);

        } else if (message_type == 'e') {
            //player is trying to end the game
            this.endGame(client.game.id, client.userid, message_parts[1]);

        } else if (message_type == 'r') {
            //client has requested a rematch
            var thegame = this.games[client.game.id];

            if (thegame) {
                if(client.userid == thegame.player_host.userid) {
                    if (thegame.player_client.rematch) {
                        this.startGame(thegame);
                    } else {
                        thegame.player_host.rematch = true;
                    }
                } else {
                    if (thegame.player_host.rematch) {
                        this.startGame(thegame);
                    } else {
                        thegame.player_client.rematch = true;
                    }
                }
            }
        }
    },

    findGame(player) {
        if(this.game_count) {
            var joined_a_game = false;
            for(var gameid in this.games) {
                if(!this.games.hasOwnProperty(gameid)) continue;

                var game_instance = this.games[gameid];

                if(game_instance.player_count < 2) {

                    joined_a_game = true;

                    game_instance.player_client = player;
                    game_instance.gamecore.players.other.instance = player;

                    game_instance.player_client.game = game_instance;
                    game_instance.player_count++;

                    player.send('j.');

                    this.startGame(game_instance);
                }
            }

            if(!joined_a_game) this.createGame(player);

        } else {
            this.createGame(player);
        }
    },

    createGame(player) {
    	var thegame = {
            id: UUID(),                  //generate a new id for the game
            player_host : player,        //so we know who initiated the game
            player_client: null,         //nobody else joined yet, since its new
            player_count: 1              //for simple checking of state
        };

        this.games[ thegame.id ] = thegame;
        this.game_count++;

        thegame.gamecore = new game_core( thegame );

        player.send('h.');

        player.game = thegame;
        player.hosting = true;

        return thegame;
    },

    endGame(gameid, userid, message) {
    	var thegame = this.games[gameid];
        if(thegame) {

        	thegame.gamecore.stop_update();
            thegame.gamecore.active = false;

            if(thegame.player_count > 1) {

                if(userid == thegame.player_host.userid) {
                    if(thegame.player_client) {
                        thegame.player_client.send('e.' + message);
                    }

                } else {

                    if(thegame.player_host) {
                        thegame.player_host.hosting = false;
                        thegame.player_host.send('e.' + message);
                    }

                }
            }

            delete this.games[gameid];
            this.game_count--;
    	}
    },
    startGame(game) {
        game.player_host.rematch = false;
        game.player_client.rematch = false;

        game.gamecore.lastframetime = new Date().getTime();
        game.gamecore.time_left = 2.5*60;
        game.gamecore.reset_positions();

    	game.player_client.send('r.'+game.player_host.nickname);
        game.player_host.send('r.'+game.player_client.nickname);

        game.gamecore.update( new Date().getTime() );

    	game.gamecore.active = true;
    }
};

module.exports = game_server
