var game = {};

game.proposeFightTimeout = (60 * 1000);
game.proposedFights = [];
game.currentfights = [];
game.sockets = {};


game.init = function(server, mongo, socketIO, sockets) {
    this.mongo = mongo;
    this.sockets = sockets;

    socketIO.sockets.on('connection', function(socket) {
        socket.on('fightChallenge', function(opponentId) {
            if (!socket.player.identified){
                console.log('A socket unidentified client has tried to challenge opponent ' + opponentId);
                return;
            }
            mongo.db.jsFight.collection('User').findOne({
                '_id': mongo.objectId(opponentId)
            }, function (err, opponent) {
                if (err){
                    console.log('Player ' + socket.player.identity.id + ' tried to fight an unknown player ' + opponentId + '(' + err + ')');
                    return;
                }
                opponent.id = opponentId;
                game.proposeNewFight(socket.player.identity, opponent)
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

            var feedback = {};

            if (action.action === 'attack') {
                let power = 10;
                var xValid;
                if (action.player === 'left')
                    xValid = fight[tPlayer].x + 100 > fight[oPlayer].x - 30;
                else
                    xValid = fight[tPlayer].x - 100 < fight[oPlayer].x + 30;

                /*let xValid = (action.player === 'left' ?
                    fight[tPlayer].x + 100 > fight[oPlayer].x - 30 :
                    fight[tPlayer].x - 100 < fight[oPlayer].x + 30);*/

                if (
                    xValid &&
                    fight[tPlayer].y - 170 > fight[oPlayer].y - 200 &&
                    fight[tPlayer].y - 130 < fight[oPlayer].y
                ) {
                    fight[oPlayer].life -= power;
                    feedback[oPlayer + 'Life'] = power;
                }
                feedback[tPlayer + 'State'] = 'punch';
                feedback[tPlayer + "NextMove"] = 0.35;
            }
            else if (action.action === 'move') {
                let movement = 2 * action.direction;
                //thisPlayer.x =+ movement;
                fight[tPlayer].x += movement;
                if (action.player === 'left') feedback.leftPlayerMove = movement;
                else feedback.rightPlayerMove = movement;
            }
            else if (action.action === 'gravity') {
                fight[tPlayer].x += lef.velocity.x;
                fight[tPlayer].y += lef.velocity.y;
            }

            if (feedback !== {}) {
                game.sockets[fight[tPlayer].id].emit('fightUpdate', feedback);
                game.sockets[fight[oPlayer].id].emit('fightUpdate', feedback);
            }
        });

        socket.on('fightAskUpdate', function(fightId) {
            if (!socket.player.identified) {
                console.log('An unidentified socket want to update a fight');
                socket.disconnect();
            }
            else if (!game.currentfights[fightId]) {
                console.log('Client ' + socket.player.identity.pseudo + " ask for unknown fight " + fightId);
            }
            else if (
                game.currentfights[fightId].leftPlayer.id !== socket.player.identity.id &&
                game.currentfights[fightId].rightPlayer.id !== socket.player.identity.id
            ) {
                console.log('Client (' + socket.player.identity.pseudo + ') don\'t belong in fight '
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

        socket.on('fightGravityMove', function(data){

        })
    });
};

function oldAttack() {
    if (action.player === 'left') {
        if (
            // TODO x coords bugged
            fight.leftPlayer.x + 100 > fight.rightPlayer.x - 30 &&
            fight.rightPlayer.y - 170 > fight.leftPlayer.y - 200 &&
            fight.rightPlayer.y - 130 < fight.leftPlayer.y
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
            fight.rightPlayer.y - 170 > fight.leftPlayer.y - 200 &&
            fight.rightPlayer.y - 130 < fight.leftPlayer.y
        ) {
            otherPlayer.life -= power;
            feedback.leftPlayerLife = power;
            // right attack left
        }
    }
}

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
            fight.leftPlayer.state = 'idle';
            fight.leftPlayer.velocity = {x: 0, y: 0};

            fight.rightPlayer.life = fight.rightPlayer.maxLife = 1000;
            fight.rightPlayer.x = 700;
            fight.rightPlayer.y = 600;
            fight.rightPlayer.nextMove = 0;
            fight.rightPlayer.state = 'idle';
            fight.rightPlayer.velocity = {x: 0, y: 0};


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