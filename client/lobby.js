function showLadder(show) {
    if (show)
        $('#ladder').fadeIn();
    else
        $('#ladder').fadeOut();
}

$(document).ready(function(){
    var app = new Vue({
        el:"#app",
        data: {
            pseudo: 'Zarnes',
            players: [
                {pseudo: 'Zarnes', ladder: '1', score: '1000', connected: 'true'},
                {pseudo: 'Senraz', ladder: '2', score: '999', connected: 'true'},
            ]
        }
    });



    /*initCanvas($('canvas')[0]);

    setInterval(function(){
        resizeCanvas();
    }, 1000);*/

    let canvas = $('canvas')[0];
    if (canvas)
    {
        var game = new JsFightGame(canvas);
    }
    else
    {
        console.log("Game not initialized !");
    }
});