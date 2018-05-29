var debug;

function showLadder(show) {
    if (show)
        $('#ladder').fadeIn();
    else
        $('#ladder').fadeOut();
}

$(document).ready(function(){
    function socketConnection(err) {
        if (err) {
            console.log("Error from connection : " + err);
            return;
        }
        console.log('Connected with socket to server');
        let index = prompt("Index de votre pseudo", '0');
        if (!index) return;

        let identity = main.app.players[index];
        if (!identity) return;

        main.game.me = identity;
        main.socket.emit('fightGiveIdentity', identity)
    }

    var main = {};
    debug = main;

    /*main.app = new Vue({
        el:"#app",
        data: {
            pseudo: 'Zarnes',
            serverIp: 'localhost',
            players: [
                {id: '5b02dcc48898a535ec9705aa', pseudo: 'Zarnes', ladder: '1', score: '1000', connected: 'true'},
                {id: '5b02dcd58898a535ec9705ab', pseudo: 'Senraz', ladder: '2', score: '999', connected: 'true'},
            ]
        }
    });*/

    function socketInit() {
        main.socket = io.connect('http://' + main.app.serverIp);
        main.socket.on('connection', function(err) {
            socketConnection(err);
            main.game.socket = main.socket;
            main.game.socketInit();
        });
        main.socket.on('fightNotificationIdentified', function (err) {
            if (err) {
                console.log('Can\'t be identified : ' + err);
                main.game.me = null;
            }
            else {
                main.game.identified = true;
            }
        });
        main.socket.on('message', function(message) { console.log('Message from server : ' + message); });
    }

    $.ajax({
        url: "vuedata",
        method: 'GET'
    }).done(function(data) {
        console.log('vue data fetched');
        console.log(data);
        main.app = new Vue({
            el:"#app",
            data: data
        });

        socketInit();

        let canvas = $('canvas')[0];
        if (canvas)
            main.game = new FightGame(canvas, main);
        else
            console.log("Game not initialized !");
    });
});