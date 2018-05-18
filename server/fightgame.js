var io;

var game = {};

game.proposedFights = [];
game.proposeFightTimeout = (60 * 1000);

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

game.checkFightTimeout = function() {
    var i = 0;
    let now = Date.now();
    while(true) {
        if (i === game.proposedFights.length) {
            return;
        }
        else if (game.proposedFights[i].timeStamp + game.proposeFightTimeout > now) {
            game.proposedFights[i].splice(i, 1);
        }
        else {
            ++i;
        }
    }
};

game.proposeNewFight = function(asker, target) {
    for (var i = 0; i < game.proposedFights.length; ++i) {

        if(game.proposedFights[i].asker === asker) {
            game.proposedFights.splice(i, 1);
            game.proposeNewFight(asker, target);
            return;
        }
        else if (asker === game.proposedFights[i].target
            && target === game.proposedFights[i].asker
            && Date.now() < game.proposedFights[i].timeStamp + (1000 * 60)) {
            // TODO return that there is a valid fight waiting
            return;
        }
    }

    game.proposedFights.push({
        asker: asker,
        target: target,
        fightId: 1,
        askerToken: 111,
        targetToken: 111,
        timeStamp: Date.now()
    });
};

exports.data = game;