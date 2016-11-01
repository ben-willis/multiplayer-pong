var game_player = function( game_instance, player_instance ) {
        //Store the instances, if any
    this.instance = player_instance;
    this.game = game_instance;

        //Set up initial values for our state information
    this.top = 250;
    this.score = 0;
    this.id = '';
    this.height = 100;

        //These are used in moving us around later
    this.old_state = {top: 250};
    this.cur_state = {top: 250};
    this.state_time = new Date().getTime();
    this.state_dt = 45;

        //Our local history of inputs
    this.inputs = [];

    if (player_instance) this.host = true;
};

game_player.prototype.draw = function() {
    game.ctx.fillStyle = "#fff";
	if (this.host) {
		game.ctx.fillRect(0, this.top, 20, this.height);
	} else {
		game.ctx.fillRect(880, this.top, 20, this.height);
	}
}

game_player.prototype.reset_position = function () {
    this.top = 250;
    this.height = 100;
    this.old_state = {top: 250};
    this.cur_state = {top: 250};
}

game_player.prototype.reset_score = function () {
    this.score = 0;
}

module.exports = game_player;
