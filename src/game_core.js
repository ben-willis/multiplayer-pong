var game_player = require('./game_player.js');
var game_puck = require('./game_puck.js');
var THREEx = require('./keyboard.js');

/* GAME CORE CLASS */
function game_core (game_instance) {
	this.instance = game_instance;
	this.server = this.instance !== undefined;

	this.input_seq = 0;

    this.active = false;

    this.puck = new game_puck(this);

	if(this.server) {
        this.players = {
            self : new game_player(this,this.instance.player_host),
            other : new game_player(this,this.instance.player_client)
        };
    } else {

        this.players = {
            self : new game_player(this),
            other : new game_player(this)
        };

        this.keyboard = new THREEx.KeyboardState();

        this.server_updates = [];
    }

    this.reset_positions();

    this.pdte = new Date().getTime();

    setInterval(function(){
        this.pdt = (new Date().getTime() - this._pdte);
        this.pdte = new Date().getTime();
        if (this.active) this.update_physics();
    }.bind(this), 15);
};

/* HELPER FUNCTIONS */
game_core.prototype.stop_update = function() {  window.cancelAnimationFrame( this.updateid );  };

game_core.prototype.reset_positions = function() {
    this.players.self.reset_score();
    this.players.self.reset_position();
    this.players.other.reset_score();
    this.players.other.reset_position();

    this.puck.reset_position()
    this.puck.angle = 90;
};

game_core.prototype.update = function( t ) {

	this.dt = this.lastframetime ? (t - this.lastframetime)/1000.0 : 0.016;

    //Store the last frame time
    this.lastframetime = t;

    this.time_left = this.time_left - this.dt;

    this.updateid = window.requestAnimationFrame( this.update.bind(this) );

    //Update the game specifics
    if(!this.server) {
        this.client_update();
    } else {
        this.server_update();
    }
};

game_core.prototype.update_physics = function() {

    if(this.server) {
        this.server_update_physics();
    } else {
        this.client_update_physics();
    }

};

game_core.prototype.process_input = function( player ) {

    var y_dir = 0;
    var ic = player.inputs.length;
    if(ic) {
        for(var j = 0; j < ic; ++j) {

            if(player.inputs[j].seq <= player.last_input_seq) continue;

            var input = player.inputs[j].inputs;
            var c = input.length;
            for(var i = 0; i < c; ++i) {
                var key = input[i];
                if(key == 'u') {
                    y_dir -= 1;
                }
                if(key == 'd') {
                    y_dir += 1;
                }
            }

        }

        player.last_input_seq = player.inputs[ic-1].seq;

    }

    return y_dir;

};

game_core.prototype.check_player_collision = function(player) {
	if (player.top+player.height >= 600) {
        player.top = 600-player.height;
    } else if (player.top <= 0) {
        player.top = 0;
    }
};

game_core.prototype.check_puck_collision = function(player1, player2, puck) {

	if (puck.top <= 0) {
        puck.angle = puck.angle>0 ? 180 - puck.angle : -180 - puck.angle;
      	puck.top=0;
    } else if (puck.top +10 >= 600) {
    	puck.angle = puck.angle>0 ? 180 - puck.angle : -180 - puck.angle;
      	puck.top = 600-10;
    } else if (puck.old_state.left > 20 && puck.left <= 20) {

    	if (puck.top > player1.top - 10 && puck.top < player1.top+player1.height) {

        	multiplier = 2*(player1.top - (puck.top+10))/(player1.height+10) + 1;	//between 1 at top -1 at bottom
        	max = multiplier>0 ? Math.min(160 + puck.angle, 30) : Math.min(-puck.angle, 30 );	//the maximum extra angle

    		puck.angle = -puck.angle + (multiplier * max);
        	puck.speed += 1;

        	puck.left = 20;
    	}

    } else if (puck.old_state.left < 880 && puck.left >= 880) {

    	if (puck.top > player2.top - 10 && puck.top < player2.top+player2.height) {
        	multiplier = 2*(player2.top - (puck.top+10))/(player2.height+10) + 1;
    		max = multiplier>0 ? Math.min(160 - puck.angle, 30) : Math.min(puck.angle, 30 );

    		puck.angle = -puck.angle - (multiplier * max);
        	puck.speed += 1;

        	puck.left = 880;
      	}

    } else if (puck.left < -80) {
        puck.reset_position();
        player2.score++;
    } else if (puck.left > 970) {
        puck.reset_position();
        player1.score++;
    }
};

/* SERVER FUNCTIONS */;

game_core.prototype.server_update_physics = function() {

    this.players.self.old_state.top = this.players.self.top;
    var new_dir = this.process_input(this.players.self);
    this.players.self.top += new_dir * 5;

    this.players.other.old_state.top = this.players.other.top;
    var other_new_dir = this.process_input(this.players.other);
    this.players.other.top += other_new_dir * 5;

    this.puck.old_state = {top: this.puck.top, left: this.puck.left};
    this.puck.top += this.puck.speed * Math.cos(this.puck.angle  * (Math.PI/180));
    this.puck.left += this.puck.speed * Math.sin(this.puck.angle  * (Math.PI/180));

    this.check_player_collision( this.players.self );
    this.check_player_collision( this.players.other );
    this.check_puck_collision( this.players.self, this.players.other, this.puck );

    this.players.self.inputs = [];
    this.players.other.inputs = [];

};

game_core.prototype.server_update = function(){

    if (this.time_left < 0) {
        this.stop_update();
        this.active = false;
        this.players.self.instance.send('t');
        this.players.other.instance.send('t');
        return;
    }

    //Make a snapshot of the current state, for updating the clients
    this.laststate = {
        ht  : this.players.self.top,                //'host top', the game creators position
        hi  : this.players.self.last_input_seq,     //'host last input', the hosts last used input
        hs  : this.players.self.score,              //'host score'
        ct  : this.players.other.top,               //'client top', the person that joined, their position
        ci  : this.players.other.last_input_seq,    //'client last input', the clients last used input
        cs  : this.players.other.score,             //'client score'
        pt  : this.puck.top,     					//'puck top', the pucks y coordinate
        pl  : this.puck.left,    					//'puck left', the pucks x coordinate
        pa  : this.puck.angle,                      //'puck angle', used for prediction
        ps  : this.puck.speed,                      //'puck speed', used for prediction
        t   : this.time_left                        // the time left in the game
    };

    // Send the snapshot to the 'host' player
    if(this.players.self.instance) {
        this.players.self.instance.emit( 'onserverupdate', this.laststate );
    }

    // Send the snapshot to the 'client' player
    if(this.players.other.instance) {
        this.players.other.instance.emit( 'onserverupdate', this.laststate );
    }

};

game_core.prototype.server_handle_input = function(client, input, input_seq) {

    var player_client = (client.userid == this.players.self.instance.userid) ? this.players.self : this.players.other;

   player_client.inputs.push({inputs:input, seq:input_seq});

};

/* CLIENT FUNCTIONS */

game_core.prototype.client_connect_to_server = function() {

        this.socket = io.connect();

        this.socket.on('onserverupdate', this.client_onserverupdate_recieved.bind(this));

        this.socket.on('finding game', function(data){
            console.log('finding game');
        	this.players.self.id = data.id;
            this.players.self.nickname = data.nickname;
        }.bind(this));

        this.socket.on('message', this.client_onnetmessage.bind(this));

};

game_core.prototype.client_find_game = function(nickname) {
    document.getElementById('find-game-button').disabled = true ;
    document.getElementById('find-game-button').value = "Finding game..." ;
    document.getElementById('nicknameInput').parentElement.classList.add("hidden") ;

    var nickname = document.getElementById('nicknameInput').value;
    this.socket.send('f.' + nickname);

    this.ctx.clearRect(0,0,900,600);
}

game_core.prototype.client_onserverupdate_recieved = function(data){

    var player_host = this.players.self.host ?  this.players.self : this.players.other;
    var player_client = this.players.self.host ?  this.players.other : this.players.self;
    var this_player = this.players.self;

    this.server_updates.push(data);

    if(this.server_updates.length >= ( 60*2 )) {
        this.server_updates.splice(0,1);
    }

    this.client_process_server_updates();

};

game_core.prototype.client_process_server_updates = function() {

    //No updates...
    if(!this.server_updates.length) return;

    var latest_server_data = this.server_updates[this.server_updates.length-1];

    this.time_left = latest_server_data.t;

    this.puck.old_state = {top: this.puck.cur_state.top, left: this.puck.cur_state.left};
    this.puck.cur_state = {top: latest_server_data.pt,left: latest_server_data.pl};
    this.puck.angle = latest_server_data.pa; this.puck.speed = latest_server_data.ps;
    this.puck.state_dt = new Date().getTime() - this.puck.state_time;
    this.puck.state_time = new Date().getTime();

    if (this.players.self.host) {
        var my_server_pos = latest_server_data.ht;
        var my_last_input_on_server = latest_server_data.hi;

        var other_server_pos = latest_server_data.ct;

        this.players.self.score = latest_server_data.hs;
        this.players.other.score = latest_server_data.cs;
    } else {
        var my_server_pos = latest_server_data.ct;
        var my_last_input_on_server = latest_server_data.ci;

        var other_server_pos = latest_server_data.ht;

        this.players.other.score = latest_server_data.hs;
        this.players.self.score = latest_server_data.cs;
    }

    this.players.other.old_state.top = this.players.other.cur_state.top;
    this.players.other.cur_state.top = other_server_pos;
    this.players.other.state_dt = new Date().getTime() - this.players.other.state_time;
    this.players.other.state_time = new Date().getTime();

	// Correct with server and reconcile differences
    if(my_last_input_on_server) {

        var lastinputseq_index = -1;
        for(var i = 0; i < this.players.self.inputs.length; ++i) {
            if(this.players.self.inputs[i].seq == my_last_input_on_server) {
                lastinputseq_index = i;
                break;
            }
        }

        if(lastinputseq_index != -1) {
            this.players.self.inputs.splice(0, Math.abs(lastinputseq_index - (-1)));
            this.players.self.cur_state.top = my_server_pos;
            this.players.self.state_dt = new Date().getTime() - this.players.self.state_time;
            this.players.self.state_time = new Date().getTime();
            this.players.self.last_input_seq = lastinputseq_index;

            this.client_update_physics();
            this.players.self.top = this.players.self.cur_state.top;
            this.check_player_collision( this.players.self );


        }
    }

};

game_core.prototype.client_update = function() {
	this.ctx.clearRect(0,0,900,600);

	this.client_handle_input();

    this.players.self.top = this.players.self.cur_state.top;
    this.check_player_collision( this.players.self );
	this.players.self.draw();

    var animation_proportion = ((new Date().getTime()) - this.players.other.state_time)/this.players.other.state_dt;
    this.players.other.top =  this.players.other.old_state.top + (this.players.other.cur_state.top - this.players.other.old_state.top) * animation_proportion;
	this.players.other.draw();

    this.puck.top =  this.puck.cur_state.top;
    this.puck.left =  this.puck.cur_state.left;
	this.puck.draw();

    this.ctx.textAlign = "center";

    // Draw time
    this.ctx.font = "30px arial";
    this.ctx.fillStyle = "#555";
    this.ctx.fillText(String('0'+Math.floor(this.time_left/60)).slice(-1) + ":" + String('00'+Math.floor(this.time_left%60)).slice(-2), 450, 200);

    // Draw scores
    this.ctx.font = "30px arial";
    this.ctx.fillStyle = "#555";
    if(this.players.self.host) {
        this.ctx.font = "15px arial";
        this.ctx.fillText(this.players.self.nickname, 300, 120);
        this.ctx.fillText(this.players.other.nickname, 600, 120);

        this.ctx.font = "30px arial";
        this.ctx.fillText(this.players.self.score, 300, 150);
        this.ctx.fillText(this.players.other.score, 600, 150);
    } else {
        this.ctx.font = "15px arial";
        this.ctx.fillText(this.players.other.nickname, 300, 120);
        this.ctx.fillText(this.players.self.nickname, 600, 120);

        this.ctx.font = "30px arial";
        this.ctx.fillText(this.players.other.score, 300, 150);
        this.ctx.fillText(this.players.self.score, 600, 150);
    }

};

game_core.prototype.client_onnetmessage = function(data) {

    console.log(data);

    var commands = data.split('.');
    var command = commands[0];
    var commanddata = commands[1] || null;

    switch(command) {

        case 'h' : //host a game requested
            this.players.self.host = true;
            break;

        case 'j' : //join a game requested
            this.players.other.host = true;
            break;

        case 'r' : //game is ready
            document.getElementById('menu-container').classList.add("hidden");

            document.getElementById('find-game-button').disabled = false ;
            document.getElementById('find-game-button').value = "Find Game" ;
            document.getElementById('nicknameInput').parentElement.classList.remove("hidden") ;

            document.getElementById('request-button').disabled = false ;

            this.reset_positions();
            this.update( new Date().getTime() );
            this.active = true;
            this.players.other.nickname = commanddata;
            break;

        case 'e' : //end game requested
            if (commanddata === 'disconnect') {
                document.getElementById('start-message').innerHTML = "Disconnection, final score: " +this.players.self.score + " - " + this.players.other.score + ".";
            } else if (commanddata === "reject") {
                document.getElementById('start-message').innerHTML = "Reject, final score: " +this.players.self.score + " - " + this.players.other.score + ".";
            } else {
                document.getElementById('start-message').innerHTML = "Welcome, enter a nickname and find a game!";
            }

            document.getElementById('start-menu').style.display = "block";
            document.getElementById('end-menu').style.display = "none";
            document.getElementById('menu-container').classList.remove("hidden");


            this.stop_update();
            this.active = false;
            this.players.self.host = false;
            this.players.other.host = false;

            break;

        case 't' : //end game requested
            document.getElementById('start-menu').style.display = "none";
            document.getElementById('end-menu').style.display = "block";
            document.getElementById('menu-container').classList.remove("hidden");


            this.stop_update();
            this.active = false;

            break;
    }


};

game_core.prototype.client_update_physics = function() {

    this.players.self.old_state.top = this.players.self.cur_state.top;
    var new_dir = this.process_input(this.players.self);
    this.players.self.cur_state.top = this.players.self.old_state.top + new_dir * 5;

    this.puck.old_state = {top: this.puck.cur_state.top, left: this.puck.cur_state.left};
    this.puck.cur_state.top += this.puck.speed * Math.cos(this.puck.angle  * (Math.PI/180));
    this.puck.cur_state.left += this.puck.speed * Math.sin(this.puck.angle  * (Math.PI/180));

    this.check_player_collision( this.players.self );

};

game_core.prototype.client_handle_input = function() {

    var input = [];

    if( this.keyboard.pressed('up') || this.keyboard.pressed('upButton') ) {

        input.push('u');

    } //up

    if( this.keyboard.pressed('down') || this.keyboard.pressed('downButton')) {

        input.push('d');

    } //down


    if(input.length) {

        this.input_seq += 1;

            //Store the input state as a snapshot of what happened.
        this.players.self.inputs.push({
            inputs : input,
            seq : this.input_seq
        });

            //Send the packet of information to the server.
            //The input packets are labelled with an 'i' in front.
        var server_packet = 'i.';
            server_packet += input.join('-') + '.';
            server_packet += this.input_seq;

            //Go
        this.socket.send( server_packet );

            //Update what sequence we are on now

    }

};

game_core.prototype.client_reject_rematch = function() {
    this.socket.send('e.reject');
    this.client_onnetmessage('e.reset');
};

game_core.prototype.client_request_rematch = function() {
    this.socket.send('r.request');

    document.getElementById('request-button').disabled = true;
};

module.exports = game_core;
