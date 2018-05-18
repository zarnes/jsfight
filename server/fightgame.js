var io;

var game = {};

game.proposedFights = [];

game.init = function(server) {
    io = require('socket.io').listen(server);

    io.sockets.on('connection', function(socket) {
        console.log('New client connected');
        socket.emit('message', 'Vous etes conncté :)');

        socket.on('message', function(message){
            console.log('A client say : ' + message);
        })
    });
};

game.proposeNewFight = function(asker, target) {
    for (var i = 0; i < game.proposedFights.length; ++i) {
        if(game.proposedFights[i].asker === asker) {
            game.proposedFights.splice(i, 1);
            game.proposeNewFight(asker, target);
            return;
        }
        else if (asker === game.proposedFights[i].target && target === game.proposedFights[i].asker) {
            // TODO return that there is a valid fight waiting
            return;
        }
    }
};

exports.data = game;