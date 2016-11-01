/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var game_core = __webpack_require__(1);

	// this is the client side code this handles connecting to server
	window.onload = function () {

	  //Create our game client instance.
	  game = new game_core();

	  game.client_connect_to_server();

	  document.getElementById('start-menu').style.display = "block";
	  document.getElementById('end-menu').style.display = "none";

	  //Fetch the canvas
	  game.canvas = document.getElementById('canvas');

	  //Fetch the rendering contexts
	  game.ctx = game.canvas.getContext('2d');
	};

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	var game_player = __webpack_require__(2);
	var game_puck = __webpack_require__(3);
	var THREEx = __webpack_require__(4);

	/* GAME CORE CLASS */
	function game_core(game_instance) {
	    this.instance = game_instance;
	    this.server = this.instance !== undefined;

	    this.input_seq = 0;

	    this.active = false;

	    this.puck = new game_puck(this);

	    if (this.server) {
	        this.players = {
	            self: new game_player(this, this.instance.player_host),
	            other: new game_player(this, this.instance.player_client)
	        };
	    } else {

	        this.players = {
	            self: new game_player(this),
	            other: new game_player(this)
	        };

	        this.keyboard = new THREEx.KeyboardState();

	        this.server_updates = [];
	    }

	    this.reset_positions();

	    this.pdte = new Date().getTime();

	    setInterval(function () {
	        this.pdt = new Date().getTime() - this._pdte;
	        this.pdte = new Date().getTime();
	        if (this.active) this.update_physics();
	    }.bind(this), 15);
	};

	/* HELPER FUNCTIONS */
	game_core.prototype.stop_update = function () {
	    window.cancelAnimationFrame(this.updateid);
	};

	game_core.prototype.reset_positions = function () {
	    this.players.self.reset_score();
	    this.players.self.reset_position();
	    this.players.other.reset_score();
	    this.players.other.reset_position();

	    this.puck.reset_position();
	    this.puck.angle = 90;
	};

	game_core.prototype.update = function (t) {

	    this.dt = this.lastframetime ? (t - this.lastframetime) / 1000.0 : 0.016;

	    //Store the last frame time
	    this.lastframetime = t;

	    this.time_left = this.time_left - this.dt;

	    this.updateid = window.requestAnimationFrame(this.update.bind(this));

	    //Update the game specifics
	    if (!this.server) {
	        this.client_update();
	    } else {
	        this.server_update();
	    }
	};

	game_core.prototype.update_physics = function () {

	    if (this.server) {
	        this.server_update_physics();
	    } else {
	        this.client_update_physics();
	    }
	};

	game_core.prototype.process_input = function (player) {

	    //It's possible to have recieved multiple inputs by now,
	    //so we process each one
	    var y_dir = 0;
	    var ic = player.inputs.length;
	    if (ic) {
	        for (var j = 0; j < ic; ++j) {

	            if (player.inputs[j].seq <= player.last_input_seq) continue;

	            var input = player.inputs[j].inputs;
	            var c = input.length;
	            for (var i = 0; i < c; ++i) {
	                var key = input[i];
	                if (key == 'u') {
	                    y_dir -= 1;
	                }
	                if (key == 'd') {
	                    y_dir += 1;
	                }
	            } //for all input values
	        } //for each input command

	        player.last_input_seq = player.inputs[ic - 1].seq;
	    } //if we have inputs

	    //give it back
	    return y_dir;
	};

	game_core.prototype.check_player_collision = function (player) {
	    if (player.top + player.height >= 600) {
	        player.top = 600 - player.height;
	    } else if (player.top <= 0) {
	        player.top = 0;
	    }
	};

	game_core.prototype.check_puck_collision = function (player1, player2, puck) {

	    if (puck.top <= 0) {
	        puck.angle = puck.angle > 0 ? 180 - puck.angle : -180 - puck.angle;
	        puck.top = 0;
	    } else if (puck.top + 10 >= 600) {
	        puck.angle = puck.angle > 0 ? 180 - puck.angle : -180 - puck.angle;
	        puck.top = 600 - 10;
	    } else if (puck.old_state.left > 20 && puck.left <= 20) {

	        if (puck.top > player1.top - 10 && puck.top < player1.top + player1.height) {

	            multiplier = 2 * (player1.top - (puck.top + 10)) / (player1.height + 10) + 1; //between 1 at top -1 at bottom
	            max = multiplier > 0 ? Math.min(160 + puck.angle, 30) : Math.min(-puck.angle, 30); //the maximum extra angle

	            puck.angle = -puck.angle + multiplier * max;
	            puck.speed += 1;

	            puck.left = 20;
	        }
	    } else if (puck.old_state.left < 880 && puck.left >= 880) {

	        if (puck.top > player2.top - 10 && puck.top < player2.top + player2.height) {
	            multiplier = 2 * (player2.top - (puck.top + 10)) / (player2.height + 10) + 1;
	            max = multiplier > 0 ? Math.min(160 - puck.angle, 30) : Math.min(puck.angle, 30);

	            puck.angle = -puck.angle - multiplier * max;
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

	game_core.prototype.server_update_physics = function () {

	    //Handle player one
	    this.players.self.old_state.top = this.players.self.top;
	    var new_dir = this.process_input(this.players.self);
	    this.players.self.top += new_dir * 5;

	    //Handle player two
	    this.players.other.old_state.top = this.players.other.top;
	    var other_new_dir = this.process_input(this.players.other);
	    this.players.other.top += other_new_dir * 5;

	    //Handle puck
	    this.puck.old_state = { top: this.puck.top, left: this.puck.left };
	    this.puck.top += this.puck.speed * Math.cos(this.puck.angle * (Math.PI / 180));
	    this.puck.left += this.puck.speed * Math.sin(this.puck.angle * (Math.PI / 180));

	    //Keep the physics position in the world
	    this.check_player_collision(this.players.self);
	    this.check_player_collision(this.players.other);
	    this.check_puck_collision(this.players.self, this.players.other, this.puck);

	    this.players.self.inputs = []; //we have cleared the input buffer, so remove this
	    this.players.other.inputs = []; //we have cleared the input buffer, so remove this
	};

	game_core.prototype.server_update = function () {

	    if (this.time_left < 0) {
	        this.stop_update();
	        this.active = false;
	        this.players.self.instance.send('t');
	        this.players.other.instance.send('t');
	        return;
	    }

	    //Make a snapshot of the current state, for updating the clients
	    this.laststate = {
	        ht: this.players.self.top, //'host top', the game creators position
	        hi: this.players.self.last_input_seq, //'host last input', the hosts last used input
	        hs: this.players.self.score, //'host score'
	        ct: this.players.other.top, //'client top', the person that joined, their position
	        ci: this.players.other.last_input_seq, //'client last input', the clients last used input
	        cs: this.players.other.score, //'client score'
	        pt: this.puck.top, //'puck top', the pucks y coordinate
	        pl: this.puck.left, //'puck left', the pucks x coordinate
	        pa: this.puck.angle, //'puck angle', used for prediction
	        ps: this.puck.speed, //'puck speed', used for prediction
	        t: this.time_left // the time left in the game
	    };

	    //Send the snapshot to the 'host' player
	    if (this.players.self.instance) {
	        this.players.self.instance.emit('onserverupdate', this.laststate);
	    }

	    //Send the snapshot to the 'client' player
	    if (this.players.other.instance) {
	        this.players.other.instance.emit('onserverupdate', this.laststate);
	    }
	};

	game_core.prototype.server_handle_input = function (client, input, input_seq) {

	    //Fetch which client this refers to out of the two
	    var player_client = client.userid == this.players.self.instance.userid ? this.players.self : this.players.other;

	    //Store the input on the player instance for processing in the physics loop
	    player_client.inputs.push({ inputs: input, seq: input_seq });
	};

	/* CLIENT FUNCTIONS */

	game_core.prototype.client_connect_to_server = function () {

	    //Store a local reference to our connection to the server
	    this.socket = io.connect();

	    //Sent each tick of the server simulation. This is our authoritive update
	    this.socket.on('onserverupdate', this.client_onserverupdate_recieved.bind(this));
	    //Handle when we connect to the server, showing state and storing id's.
	    this.socket.on('finding game', function (data) {
	        console.log('finding game');
	        this.players.self.id = data.id;
	        this.players.self.nickname = data.nickname;
	    }.bind(this));
	    //On message from the server, we parse the commands and send it to the handlers
	    this.socket.on('message', this.client_onnetmessage.bind(this));
	};

	game_core.prototype.client_find_game = function (nickname) {
	    document.getElementById('find-game-button').disabled = true;
	    document.getElementById('find-game-button').value = "Finding game...";
	    document.getElementById('nicknameInput').parentElement.classList.add("hidden");

	    var nickname = document.getElementById('nicknameInput').value;
	    this.socket.send('f.' + nickname);

	    this.ctx.clearRect(0, 0, 900, 600);
	};

	game_core.prototype.client_onserverupdate_recieved = function (data) {

	    var player_host = this.players.self.host ? this.players.self : this.players.other;
	    var player_client = this.players.self.host ? this.players.other : this.players.self;
	    var this_player = this.players.self;

	    this.server_updates.push(data);

	    if (this.server_updates.length >= 60 * 2) {
	        this.server_updates.splice(0, 1);
	    }

	    //Handle the latest positions from the server
	    //and make sure to correct our local predictions, making the server have final say.
	    this.client_process_server_updates();
	};

	game_core.prototype.client_process_server_updates = function () {

	    //No updates...
	    if (!this.server_updates.length) return;

	    //The most recent server update
	    var latest_server_data = this.server_updates[this.server_updates.length - 1];

	    this.time_left = latest_server_data.t;

	    this.puck.old_state = { top: this.puck.cur_state.top, left: this.puck.cur_state.left };
	    this.puck.cur_state = { top: latest_server_data.pt, left: latest_server_data.pl };
	    this.puck.angle = latest_server_data.pa;this.puck.speed = latest_server_data.ps;
	    this.puck.state_dt = new Date().getTime() - this.puck.state_time;
	    this.puck.state_time = new Date().getTime();

	    //Our latest server position
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

	    //this.players.self.top = my_server_pos;
	    this.players.other.old_state.top = this.players.other.cur_state.top;
	    this.players.other.cur_state.top = other_server_pos;
	    this.players.other.state_dt = new Date().getTime() - this.players.other.state_time;
	    this.players.other.state_time = new Date().getTime();

	    //here we handle our local input prediction ,
	    //by correcting it with the server and reconciling its differences

	    if (my_last_input_on_server) {

	        //The last input sequence index in my local input list
	        var lastinputseq_index = -1;
	        //Find this input in the list, and store the index
	        for (var i = 0; i < this.players.self.inputs.length; ++i) {
	            if (this.players.self.inputs[i].seq == my_last_input_on_server) {
	                lastinputseq_index = i;
	                break;
	            }
	        }

	        //Now we can crop the list of any updates we have already processed
	        if (lastinputseq_index != -1) {
	            //so we have now gotten an acknowledgement from the server that our inputs here have been accepted
	            //and that we can predict from this known position instead

	            //remove the rest of the inputs we have confirmed on the server
	            this.players.self.inputs.splice(0, Math.abs(lastinputseq_index - -1));
	            //The player is now located at the new server position, authoritive server
	            this.players.self.cur_state.top = my_server_pos;
	            this.players.self.state_dt = new Date().getTime() - this.players.self.state_time;
	            this.players.self.state_time = new Date().getTime();
	            this.players.self.last_input_seq = lastinputseq_index;
	            //Now we reapply all the inputs that we have locally that
	            //the server hasn't yet confirmed. This will 'keep' our position the same,
	            //but also confirm the server position at the same time.
	            this.client_update_physics();
	            this.players.self.top = this.players.self.cur_state.top;
	            this.check_player_collision(this.players.self);
	        }
	    }
	};

	game_core.prototype.client_update = function () {
	    this.ctx.clearRect(0, 0, 900, 600);

	    this.client_handle_input();

	    this.players.self.top = this.players.self.cur_state.top;
	    this.check_player_collision(this.players.self);
	    this.players.self.draw();

	    var animation_proportion = (new Date().getTime() - this.players.other.state_time) / this.players.other.state_dt;
	    this.players.other.top = this.players.other.old_state.top + (this.players.other.cur_state.top - this.players.other.old_state.top) * animation_proportion;
	    this.players.other.draw();

	    this.puck.top = this.puck.cur_state.top;
	    this.puck.left = this.puck.cur_state.left;
	    this.puck.draw();

	    this.ctx.textAlign = "center";

	    //draw time
	    this.ctx.font = "30px arial";
	    this.ctx.fillStyle = "#555";
	    this.ctx.fillText(String('0' + Math.floor(this.time_left / 60)).slice(-1) + ":" + String('00' + Math.floor(this.time_left % 60)).slice(-2), 450, 200);

	    // draw scores
	    this.ctx.font = "30px arial";
	    this.ctx.fillStyle = "#555";
	    if (this.players.self.host) {
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

	game_core.prototype.client_onnetmessage = function (data) {

	    console.log(data);

	    var commands = data.split('.');
	    var command = commands[0];
	    var commanddata = commands[1] || null;
	    //var commanddata = commands[2] || null;

	    switch (command) {

	        case 'h':
	            //host a game requested
	            this.players.self.host = true;
	            break;

	        case 'j':
	            //join a game requested
	            this.players.other.host = true;
	            break;

	        case 'r':
	            //game is ready
	            document.getElementById('menu-container').classList.add("hidden");

	            document.getElementById('find-game-button').disabled = false;
	            document.getElementById('find-game-button').value = "Find Game";
	            document.getElementById('nicknameInput').parentElement.classList.remove("hidden");

	            document.getElementById('request-button').disabled = false;

	            this.reset_positions();
	            this.update(new Date().getTime());
	            this.active = true;
	            this.players.other.nickname = commanddata;
	            break;

	        case 'e':
	            //end game requested
	            // show start menu

	            if (commanddata === 'disconnect') {
	                document.getElementById('start-message').innerHTML = "Disconnection, final score: " + this.players.self.score + " - " + this.players.other.score + ".";
	            } else if (commanddata === "reject") {
	                document.getElementById('start-message').innerHTML = "Reject, final score: " + this.players.self.score + " - " + this.players.other.score + ".";
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

	        case 't':
	            //end game requested
	            // show start menu
	            //document.getElementById('end-message').innerHTML = "Time up, final score: " +this.players.self.score + " - " + this.players.other.score + ".";
	            document.getElementById('start-menu').style.display = "none";
	            document.getElementById('end-menu').style.display = "block";
	            document.getElementById('menu-container').classList.remove("hidden");

	            this.stop_update();
	            this.active = false;

	            break;

	        // case 'p' : //server ping
	        //     this.client_onping(commanddata); break;

	    }
	};

	game_core.prototype.client_update_physics = function () {

	    this.players.self.old_state.top = this.players.self.cur_state.top;
	    var new_dir = this.process_input(this.players.self);
	    this.players.self.cur_state.top = this.players.self.old_state.top + new_dir * 5;

	    this.puck.old_state = { top: this.puck.cur_state.top, left: this.puck.cur_state.left };
	    this.puck.cur_state.top += this.puck.speed * Math.cos(this.puck.angle * (Math.PI / 180));
	    this.puck.cur_state.left += this.puck.speed * Math.sin(this.puck.angle * (Math.PI / 180));

	    this.check_player_collision(this.players.self);
	};

	game_core.prototype.client_handle_input = function () {

	    var input = [];

	    if (this.keyboard.pressed('up') || this.keyboard.pressed('upButton')) {

	        input.push('u');
	    } //up

	    if (this.keyboard.pressed('down') || this.keyboard.pressed('downButton')) {

	        input.push('d');
	    } //down


	    if (input.length) {

	        this.input_seq += 1;

	        //Store the input state as a snapshot of what happened.
	        this.players.self.inputs.push({
	            inputs: input,
	            seq: this.input_seq
	        });

	        //Send the packet of information to the server.
	        //The input packets are labelled with an 'i' in front.
	        var server_packet = 'i.';
	        server_packet += input.join('-') + '.';
	        server_packet += this.input_seq;

	        //Go
	        this.socket.send(server_packet);

	        //Update what sequence we are on now
	    }
	};

	game_core.prototype.client_reject_rematch = function () {
	    this.socket.send('e.reject');
	    this.client_onnetmessage('e.reset');
	};

	game_core.prototype.client_request_rematch = function () {
	    this.socket.send('r.request');

	    document.getElementById('request-button').disabled = true;
	};

	module.exports = game_core;

/***/ },
/* 2 */
/***/ function(module, exports) {

	var game_player = function (game_instance, player_instance) {
	    //Store the instances, if any
	    this.instance = player_instance;
	    this.game = game_instance;

	    //Set up initial values for our state information
	    this.top = 250;
	    this.score = 0;
	    this.id = '';
	    this.height = 100;

	    //These are used in moving us around later
	    this.old_state = { top: 250 };
	    this.cur_state = { top: 250 };
	    this.state_time = new Date().getTime();
	    this.state_dt = 45;

	    //Our local history of inputs
	    this.inputs = [];

	    if (player_instance) this.host = true;
	};

	game_player.prototype.draw = function () {
	    game.ctx.fillStyle = "#fff";
	    if (this.host) {
	        game.ctx.fillRect(0, this.top, 20, this.height);
	    } else {
	        game.ctx.fillRect(880, this.top, 20, this.height);
	    }
	};

	game_player.prototype.reset_position = function () {
	    this.top = 250;
	    this.height = 100;
	    this.old_state = { top: 250 };
	    this.cur_state = { top: 250 };
	};

	game_player.prototype.reset_score = function () {
	    this.score = 0;
	};

	module.exports = game_player;

/***/ },
/* 3 */
/***/ function(module, exports) {

	var game_puck = function (game_instance) {
	    //Store the instances, if any
	    this.game = game_instance;

	    //Set up initial values for our state information
	    this.top = 295;
	    this.left = 445;
	    this.speed = 2;
	    this.angle = 90;

	    //These are used in moving us around later
	    this.old_state = { top: 295, left: 445 };
	    this.cur_state = { top: 295, left: 445 };
	    this.state_time = new Date().getTime();
	    this.state_dt = 45;
	};

	game_puck.prototype.draw = function () {
	    game.ctx.fillStyle = '#fff';
	    game.ctx.fillRect(this.left, this.top, 10, 10);
	};

	game_puck.prototype.reset_position = function () {
	    this.top = 295;
	    this.left = 445;
	    this.speed = 2;
	};

	module.exports = game_puck;

/***/ },
/* 4 */
/***/ function(module, exports) {

	// THREEx.KeyboardState.js keep the current state of the keyboard.
	// It is possible to query it at any time. No need of an event.
	// This is particularly convenient in loop driven case, like in
	// 3D demos or games.
	//
	// # Usage
	//
	// **Step 1**: Create the object
	//
	// ```var keyboard	= new THREEx.KeyboardState();```
	//
	// **Step 2**: Query the keyboard state
	//
	// This will return true if shift and A are pressed, false otherwise
	//
	// ```keyboard.pressed("shift+A")```
	//
	// **Step 3**: Stop listening to the keyboard
	//
	// ```keyboard.destroy()```
	//
	// NOTE: this library may be nice as standaline. independant from three.js
	// - rename it keyboardForGame
	//
	// # Code
	//

	/** @namespace */
	var THREEx = THREEx || {};

	/**
	 * - NOTE: it would be quite easy to push event-driven too
	 *   - microevent.js for events handling
	 *   - in this._onkeyChange, generate a string from the DOM event
	 *   - use this as event name
	*/
	THREEx.KeyboardState = function (domElement) {
		this.domElement = domElement || document;
		// to store the current state
		this.keyCodes = {};
		this.modifiers = {};

		// create callback to bind/unbind keyboard events
		var _this = this;
		this._onKeyDown = function (event) {
			_this._onKeyChange(event);
		};
		this._onKeyUp = function (event) {
			_this._onKeyChange(event);
		};

		this.domElement.getElementById('button-up').ontouchstart = function () {
			this.upButton = true;
		}.bind(this);
		this.domElement.getElementById('button-down').ontouchstart = function () {
			this.downButton = true;
		}.bind(this);
		this.domElement.getElementById('button-up').ontouchend = function () {
			this.upButton = false;
		}.bind(this);
		this.domElement.getElementById('button-down').ontouchend = function () {
			this.downButton = false;
		}.bind(this);

		// bind keyEvents
		this.domElement.addEventListener("keydown", this._onKeyDown, false);
		this.domElement.addEventListener("keyup", this._onKeyUp, false);

		// create callback to bind/unbind window blur event
		this._onBlur = function () {
			for (var prop in _this.keyCodes) _this.keyCodes[prop] = false;
			for (var prop in _this.modifiers) _this.modifiers[prop] = false;
		};

		// bind window blur
		window.addEventListener("blur", this._onBlur, false);
	};

	/**
	 * To stop listening of the keyboard events
	*/
	THREEx.KeyboardState.prototype.destroy = function () {
		// unbind keyEvents
		this.domElement.removeEventListener("keydown", this._onKeyDown, false);
		this.domElement.removeEventListener("keyup", this._onKeyUp, false);

		// unbind window blur event
		window.removeEventListener("blur", this._onBlur, false);
	};

	THREEx.KeyboardState.MODIFIERS = ['shift', 'ctrl', 'alt', 'meta'];
	THREEx.KeyboardState.ALIAS = {
		'left': 37,
		'up': 38,
		'right': 39,
		'down': 40,
		'space': 32,
		'pageup': 33,
		'pagedown': 34,
		'tab': 9,
		'escape': 27
	};

	/**
	 * to process the keyboard dom event
	*/
	THREEx.KeyboardState.prototype._onKeyChange = function (event) {
		// log to debug
		//console.log("onKeyChange", event, event.keyCode, event.shiftKey, event.ctrlKey, event.altKey, event.metaKey)

		// update this.keyCodes
		var keyCode = event.keyCode;
		var pressed = event.type === 'keydown' ? true : false;
		this.keyCodes[keyCode] = pressed;
		// update this.modifiers
		this.modifiers['shift'] = event.shiftKey;
		this.modifiers['ctrl'] = event.ctrlKey;
		this.modifiers['alt'] = event.altKey;
		this.modifiers['meta'] = event.metaKey;
	};

	/**
	 * query keyboard state to know if a key is pressed of not
	 *
	 * @param {String} keyDesc the description of the key. format : modifiers+key e.g shift+A
	 * @returns {Boolean} true if the key is pressed, false otherwise
	*/
	THREEx.KeyboardState.prototype.pressed = function (keyDesc) {
		var keys = keyDesc.split("+");
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			var pressed = false;
			if (THREEx.KeyboardState.MODIFIERS.indexOf(key) !== -1) {
				pressed = this.modifiers[key];
			} else if (Object.keys(THREEx.KeyboardState.ALIAS).indexOf(key) != -1) {
				pressed = this.keyCodes[THREEx.KeyboardState.ALIAS[key]];
			} else if (key === 'upButton') {
				pressed = this.upButton;
			} else if (key === 'downButton') {
				pressed = this.downButton;
			} else {
				pressed = this.keyCodes[key.toUpperCase().charCodeAt(0)];
			}
			if (!pressed) return false;
		};
		return true;
	};

	/**
	 * return true if an event match a keyDesc
	 * @param  {KeyboardEvent} event   keyboard event
	 * @param  {String} keyDesc string description of the key
	 * @return {Boolean}         true if the event match keyDesc, false otherwise
	 */
	THREEx.KeyboardState.prototype.eventMatches = function (event, keyDesc) {
		var aliases = THREEx.KeyboardState.ALIAS;
		var aliasKeys = Object.keys(aliases);
		var keys = keyDesc.split("+");
		// log to debug
		// console.log("eventMatches", event, event.keyCode, event.shiftKey, event.ctrlKey, event.altKey, event.metaKey)
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			var pressed = false;
			if (key === 'shift') {
				pressed = event.shiftKey ? true : false;
			} else if (key === 'ctrl') {
				pressed = event.ctrlKey ? true : false;
			} else if (key === 'alt') {
				pressed = event.altKey ? true : false;
			} else if (key === 'meta') {
				pressed = event.metaKey ? true : false;
			} else if (aliasKeys.indexOf(key) !== -1) {
				pressed = event.keyCode === aliases[key] ? true : false;
			} else if (event.keyCode === key.toUpperCase().charCodeAt(0)) {
				pressed = true;
			}
			if (!pressed) return false;
		}
		return true;
	};

	module.exports = THREEx;

/***/ }
/******/ ]);