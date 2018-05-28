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

        socket.on('fightAction', function(action) {
            var fight = game.currentfights[action.fightId];
            if (!fight) {
                console.log('Undefined fight');
                return;
            }

            var tPlayer;
            var oPlayer;

            if (action.player === 'left') {
                tPlayer = 'leftPlayer';
                oPlayer = 'rightPlayer';
            }
            else {
                tPlayer = 'rightPlayer';
                oPlayer = 'leftPlayer';
            }

            /*if (fight.rightPlayer.id === client.identity.id) {
                thisPlayer = fight.rightPlayer;
                otherPlayer = fight.leftPlayer;
            }
            else {
                thisPlayer = fight.leftPlayer;
                otherPlayer = fight.rightPlayer;
            }*/

            var feedback = {};

            if (action.action === 'attack') {
                let power = 10;
                if (action.player === 'left') {
                    if (
                        // TODO x coords bugged
                        fight.leftPlayer.x + 100 > fight.rightPlayer.x - 30 &&
                        fight.leftPlayer.y - 130 < fight.rightPlayer.y - 200 &&
                        fight.leftPlayer.y - 170 > fight.rightPlayer.y
                        /*fight[tPlayer].x + 100 > fight[oPlayer].x - 30 &&
                        fight[tPlayer].y - 130 < fight[oPlayer].y - 200 &&
                        fight[tPlayer].y - 170 > fight[oPlayer].y*/
                    ) {
                        otherPlayer.life -= power;
                        feedback.rightPlayerLife = power;
                        // left attack right
                    }
                }
                if (action.player === 'right') {
                    if (
                        fight.rightPlayer.x - 100 < fight.leftPlayer.x + 30 &&
                        fight.rightPlayer.y - 130 < fight.leftPlayer.y - 200 &&
                        fight.rightPlayer.y - 170 > fight.leftPlayer.y
                    ) {
                        otherPlayer.life -= power;
                        feedback.leftPlayerLife = power;
                        // right attack left
                    }
                }
                /*let power = 10;
                otherPlayer.life -= power;

                if (action.player === 'left') feedback.rightPlayerLife = power;
                else feedback.leftPlayerLife = power;*/
            }
            else if (action.action === 'move') {
                let movement = 2 * action.direction;
                //thisPlayer.x =+ movement;
                fight[tPlayer].x += movement;
                if (action.player === 'left') feedback.leftPlayerMove = movement;
                else feedback.rightPlayerMove = movement;
            }

            if (feedback !== {}) {
                game.sockets[thisPlayer.id].emit('fightUpdate', feedback);
                game.sockets[otherPlayer.id].emit('fightUpdate', feedback);
            }
        });

        socket.on('fightAskUpdate', function(fightId) {
            if (!client.identified) {
                console.log('An unidentified socket want to update a fight');
                socket.disconnect();
            }
            else if (!game.currentfights[fightId]) {
                console.log('Client ' + client.identity.pseudo + " ask for unknown fight " + fightId);
            }
            else if (
                game.currentfights[fightId].leftPlayer.id !== client.identity.id &&
                game.currentfights[fightId].rightPlayer.id !== client.identity.id
            ) {
                console.log('Client (' + client.identity.pseudo + ') don\'t belong in fight '
                    + game.currentfights[fightId].fightId + ' ('
                    + game.currentfights[fightId].leftPlayer.pseudo + ' vs '
                    + game.currentfights[fightId].rightPlayer.pseudo + ')');
            }
            else
            {
                let feedback = {
                    fight: game.currentfights[fightId]
                };
                socket.emit('fightUpdate', feedback);
            }
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
            fight.leftPlayer.x = 300;
            fight.leftPlayer.y = 600;
            fight.leftPlayer.nextMove = 0;

            fight.rightPlayer.life = fight.rightPlayer.maxLife = 1000;
            fight.rightPlayer.x = 700;
            fight.rightPlayer.y = 600;
            fight.rightPlayer.nextMove = 0;


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