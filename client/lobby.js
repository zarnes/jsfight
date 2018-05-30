var debug;

function showLadder(show) {
    if (show)
        $('#ladder').fadeIn();
    else
        $('#ladder').fadeOut();
}

$(document).ready(function(){
    $(document).on("submit", "form", function(e){
        e.preventDefault();
        var message = $("form input[name=message]").val();
        main.chat.send(message);
        return  true;
    });

    var main = {};
    debug = main;

    function socketConnection(err) {
        if (err) {
            console.log("Error from connection : " + err);
            return;
        }
        console.log('Connected with socket to server');

        let identity = main.app.me;
        if (!identity) return;

        main.game.me = identity;
        main.socket.emit('fightGiveIdentity', identity)
    }

    function socketInit() {
        main.socket = io.connect('http://' + main.app.serverIp);
        main.socket.on('connection', function(err) {
            socketConnection(err);
            main.game.socket = main.socket;
            main.game.socketInit();
            main.chat.initsocket();
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

        main.socket.on('update players', function(){
            main.getPlayers();
        });
    }

    main.getPlayers = function(callback = false) {
        $.ajax({
            url: 'vuedata',
            method: 'GET'
        }).done(function(data) {
            if (main.app)
                main.app.players = data.players;
            else
                main.app = new Vue({
                    el:"#app",
                    data: data
                });

            // Connected players display, because Vue Js is dumb
            $('.player-connected').remove();
            for(var i = 0; i < data.players.length; ++i) {
                let player = data.players[i];
                if (player.connected) {
                    var html = '<div class="player-connected">' +
                        '<span class="player-name">' + player.pseudo +'</span>' +
                        '<span class="player-score"> (' + player.score + ' </span>' +
                        '<span class="player-ladder">' + player.ladder + ')</span>';
                    if (player._id !== main.app.me._id) {
                        html += '<button class="btn btn-danger">Défier</button>' +
                        '<span class="hidden">' + player._id + '</span>';
                    }
                    html += '</div>';

                    $('#connected-players').append(html);
                }
            }

            // Challenge buttons initialization
            $('.player-connected').each(function(e){
                let id = $(this).find('.hidden').text();
                $(this).find('button').off();
                $(this).find('button').on('click', function() {
                    console.log('proposing fight to ' + id);
                    main.game.proposeFight(id);
                });
            });

            // Datatable initialization
            if (main.dataTable !== undefined)
                main.dataTable.destroy();
            main.dataTable = $('#table-ladder').DataTable( {
                data:main.app.players,
                columns: [
                    { data: 'ladder'},
                    { data: 'pseudo'},
                    { data: 'score'},
                    { data: 'wins'},
                    { data: 'loses'},
                    { data: 'playtime'},
                    { data: 'connected'}
                ]
            } );

            if (callback !== false)
                callback();
        })
    };

    main.getPlayers(function() {
        // Socket initialization
        socketInit();

        // FightGame initialization
        let canvas = $('canvas')[0];
        if (canvas)
            main.game = new FightGame(canvas, main);
        else
            console.log("Game not initialized !");

        // Chat initialization
        main.chat = new Chat(main);
        main.chat.socket = main.socket;
    });
});