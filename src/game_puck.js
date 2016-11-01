var game_puck = function( game_instance ) {
        //Store the instances, if any
    this.game = game_instance;

        //Set up initial values for our state information
    this.top = 295;
    this.left = 445;
    this.speed = 2;
    this.angle = 90;

        //These are used in moving us around later
    this.old_state = {top: 295, left: 445};
    this.cur_state = {top: 295, left: 445};
    this.state_time = new Date().getTime();
    this.state_dt = 45;

};

game_puck.prototype.draw = function() {
	game.ctx.fillStyle = '#fff';
	game.ctx.fillRect(this.left, this.top, 10, 10);
}

game_puck.prototype.reset_position = function () {
    this.top = 295;
    this.left = 445;
    this.speed = 2;
}

module.exports = game_puck;
