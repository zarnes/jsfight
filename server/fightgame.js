var game = {};

game.proposeFightTimeout = (60 * 1000);
game.proposedFights = [];
game.currentfights = [];
game.sockets = {};
game.frameTime;

game.cLog = function(n, b) { return Math.log(n)/Math.log(b)};

game.finishFight = function(fight) {
    var winner;
    var loser;

    if (fight.leftPlayer.life <= 0) {
        winner = fight.rightPlayer;
        loser = fight.leftPlayer;
    }
    else {
        winner = fight.leftPlayer;
        loser = fight.rightPlayer;
    }

    var amount = 0;
    var time = 300;
    if (fight.timeStamp + (1000 * 60 * 5) > Date.now())
        time = (Date.now() - fight.timeStamp) / 1000;

    let logBase = 1.1;
    let maxPoints = 70;
    let multiplier = 0.72;

    amount = ((maxPoints - game.cLog(time, logBase)) * multiplier);
    amount = parseInt(amount);
    console.log(winner.pseudo + ' beat ' + loser.pseudo + ' in ' + time + ' seconds, granting ' + amount + ' points.');

    winner.score = parseInt(winner.score) + amount;
    loser.score = parseInt(loser.score) - amount;
    if (loser.score < 0) loser.score = 0;

    game.sockets[winner.id].player.identity.score = winner.score;
    game.sockets[loser.id].player.identity.score = loser.score;

    game.mongo.db.jsFight.collection('User').update({
        '_id': game.mongo.objectId(winner.id)
    }, {$set: {
            score: winner.score
        }});

    game.mongo.db.jsFight.collection('User').update({
        '_id': game.mongo.objectId(loser.id)
    }, {$set: {
            score: loser.score
        }});

    let data = {
        time: time,
        amount: amount,
        winnerPseudo: winner.pseudo,
        loserPseudo: loser.pseudo,
        winnerScore: winner.score,
        loserScore: loser.score
    };

    game.sockets[winner.id].emit('fightFinish', data);
    game.sockets[loser.id].emit('fightFinish', data);

    delete game.currentfights[fight.fightId];
};

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
                if (err || opponent === undefined){
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

            if (action.action === '') {
                console.log('Undefined action from player ' + socket.player.pseudo);
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
                let power = 1000;
                var xValid;
                if (action.player === 'left')
                    xValid = fight[tPlayer].x + 100 > fight[oPlayer].x - 30;
                else
                    xValid = fight[tPlayer].x - 100 < fight[oPlayer].x + 30;

                let tHeight = fight[tPlayer].crouched ? 100 : 200;
                let oHeight = fight[oPlayer].crouched ? 100 : 200;
                if (
                    xValid &&
                    fight[tPlayer].y + 30 - tHeight > fight[oPlayer].y - oHeight &&
                    fight[tPlayer].y + 70 - tHeight < fight[oPlayer].y
                ) {
                    fight[oPlayer].life -= power;
                    if (fight[oPlayer].life <= 0) {
                        feedback[oPlayer + 'Life'] = fight[oPlayer].life;
                        game.finishFight(fight);
                    }
                    else
                        feedback[oPlayer + 'Life'] = power;
                }
                feedback[tPlayer + 'State'] = 'punch';
                feedback[tPlayer + "NextMove"] = 0.35;
            }
            else if (action.action === 'kick') {
                let power = 50;
                var xValid;
                if (action.player === 'left')
                    xValid = fight[tPlayer].x + 150 > fight[oPlayer].x - 30;
                else
                    xValid = fight[tPlayer].x - 150 < fight[oPlayer].x + 30;

                let tHeight = fight[tPlayer].crouched ? 100 : 200;
                let oHeight = fight[oPlayer].crouched ? 100 : 200;
                if (
                    xValid &&
                    fight[tPlayer].y + 80 - tHeight > fight[oPlayer].y - oHeight &&
                    fight[tPlayer].y + 90 - tHeight < fight[oPlayer].y
                ) {
                    fight[oPlayer].life -= power;
                    fight[oPlayer].y -= 2;
                    feedback[oPlayer + 'Life'] = power;
                    feedback[oPlayer + "SetGravity"] = {
                        x: action.player === 'left' ? 5 : -5,
                        y: 2
                    };
                }
                feedback[tPlayer + 'State'] = 'kick';
                feedback[tPlayer + "NextMove"] = 0.70;
            }
            else if (action.action === 'move') {
                let movement = 2 * action.direction;
                //thisPlayer.x =+ movement;
                fight[tPlayer].x += movement;
                if (action.player === 'left') feedback.leftPlayerMove = movement;
                else feedback.rightPlayerMove = movement;
            }
            else if (action.action === 'jump') {
                fight[tPlayer].velocity = action.velocity;
                fight[tPlayer].y -= action.velocity.y;
                console.log(fight[tPlayer].y);
            }
            else if (action.action === 'gravity') {
                if (fight[tPlayer].y >= 600) {
                    fight[tPlayer].velocity = {x: 0, y: 0};
                }
                else {
                    fight[tPlayer].velocity = action.velocity;
                    fight[tPlayer].x += fight[tPlayer].velocity.x;
                    fight[tPlayer].y -= fight[tPlayer].velocity.y;
                }
                feedback[tPlayer + 'GravityPos'] = {x: fight[tPlayer].x, y: fight[tPlayer].y};
            }
            else if (action.action === 'gravityFloor') {
                fight[tPlayer].y = 600;
                fight[tPlayer].velocity = {x: 0, y: 0};
                feedback[tPlayer + 'GravityPos'] = {x: fight[tPlayer].x, y: fight[tPlayer].y};
            }
            else if (action.action === 'crouch') {
                fight[tPlayer].crouched = action.crouched;
                feedback[tPlayer + 'Crouched'] = action.crouched;
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

        socket.on('sendFrametime', function(frametime){
            game.frameTime = frametime;
        })
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
            fight.leftPlayer.state = 'idle';
            fight.leftPlayer.velocity = {x: 0, y: 0};
            fight.leftPlayer.crouched = false;

            fight.rightPlayer.life = fight.rightPlayer.maxLife = 1000;
            fight.rightPlayer.x = 700;
            fight.rightPlayer.y = 600;
            fight.rightPlayer.nextMove = 0;
            fight.rightPlayer.state = 'idle';
            fight.rightPlayer.velocity = {x: 0, y: 0};
            fight.rightPlayer.crouched = false;

            this.currentfights[fight.fightId] = fight;

            this.sockets[asker.id].emit('startFight', fight);
            this.sockets[target.id].emit('startFight', fight);

            this.proposedFights.splice(i, 1);
            //delete this.proposedFights[i];
            //return this.proposedFights[i];
            return true;
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