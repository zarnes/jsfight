var debug;

function showLadder(show) {
    if (show)
        $('#ladder').fadeIn();
    else
        $('#ladder').fadeOut();
}

$(document).ready(function(){
    var main = {};
    debug = main;

    main.app = new Vue({
        el:"#app",
        data: {
            pseudo: 'Zarnes',
            players: [
                {id: '5b02dcc48898a535ec9705aa', pseudo: 'Zarnes', ladder: '1', score: '1000', connected: 'true'},
                {id: '5b02dcd58898a535ec9705ab', pseudo: 'Senraz', ladder: '2', score: '999', connected: 'true'},
            ]
        }
    });


    main.fightController = new Fight();

    let canvas = $('canvas')[0];
    if (canvas)
    {
        main.game = new FightGame(canvas, main);
    }
    else
    {
        console.log("Game not initialized !");
    }
});