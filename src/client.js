var game_core = require('./game_core.js');

// this is the client side code this handles connecting to server
window.onload = function(){

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
