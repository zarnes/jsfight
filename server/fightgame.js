var game = {};

game.proposeFightTimeout = (60 * 1000);
game.proposedFights = [];
game.currentfights = [];
game.sockets = {};

game.init = function(server, mongo) {
    this.io = require('socket.io').listen(server);
    this.mongo = mongo;

    this.io.sockets.on('connection', function(socket) {
        var client = {
            identified: false
        };

        socket.emit('connection', '');

        socket.on('message', function(message){
            console.log('A client say : ' + message);
        });

        socket.on('fightGiveIdentity', function(player) {
            client.identified = true;
            client.identity = player;
            socket.emit('message', 'Vous avez été identifié en tant que ' + client.identity.pseudo);
            socket.emit('fightNotificationIdentified', '');
            game.sockets[client.identity.id] = socket;
        });

        socket.on('fightChallenge', function(opponentId) {
            if (!client.identified){
                console.log('A socket unidentified client has tried to challenge opponent ' + opponentId);
                return;
            }
            mongo.db.jsFight.collection('User').findOne({
                '_id': mongo.objectId(opponentId)
            }, function (err, opponent) {
                if (err){
                    console.log('Player ' + client.identity.id + ' tried to fight an unknown player ' + opponentId + '(' + err + ')');
                    return;
                }
                opponent.id = opponentId;
                game.proposeNewFight(client.identity, opponent)
            });
        });
    });
};

game.checkFightTimeout = function() {
    var i = 0;
    let now = Date.now();
    while(true) {
        if (i === this.proposedFights.length) {
            return;
        }
        else if (this.proposedFights[i].timeStamp + this.proposeFightTimeout > now) {
            this.proposedFights[i].splice(i, 1);
        }
        else {
            ++i;
        }
    }
};

game.proposeNewFight = function(asker, target) {
    console.log(asker.pseudo + ' ask ' + target.pseudo + ' to fight');
    for (var i = 0; i < this.proposedFights.length; ++i) {

        if(this.proposedFights[i].asker.id === asker.id) {
            this.proposedFights.splice(i, 1);
            this.proposeNewFight(asker, target);
            return false;
        }
        else if (asker.id === this.proposedFights[i].target.id
            && target.id === this.proposedFights[i].asker.id
            && Date.now() < this.proposedFights[i].timeStamp + (1000 * 60)) {

            console.log('Fight between ' + asker.pseudo + ' and ' + target.pseudo + ' begin');

            this.sockets[asker.id].emit('message', 'starting fight with ' + target.pseudo);
            this.sockets[target.id].emit('message', 'starting fight with ' + asker.pseudo);

            var fight = {
                leftPlayer: this.proposedFights[i].asker,
                rightPlayer: this.proposedFights[i].target,
                fightId: this.proposedFights[i].fightId,
                timeStamp: this.proposedFights[i].timeStamp,
            };
            fight.leftPlayer.life = fight.leftPlayer.maxLife = 1000;
            fight.rightPlayer.life = fight.rightPlayer.maxLife = 1000;
            this.currentfights[fight.fightId] = fight;

            this.sockets[asker.id].emit('startFight', fight);
            this.sockets[target.id].emit('startFight', fight);

            this.proposedFights.slice(this.proposedFights[i]);
            //return this.proposedFights[i];
        }
    }

    this.proposedFights.push({
        asker: asker,
        target: target,
        fightId: 1,
        askerToken: 111,
        targetToken: 111,
        timeStamp: Date.now()
    });

    return true;
};

exports.data = game;