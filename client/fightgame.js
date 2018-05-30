function FightGame(canvas, main) {
    this.resizeCanvas = function ()
    {
        let newCanvasWidth = $('#game-zone').width();
        if (newCanvasWidth === this.canvasWidth) return;

        this.canvasWidth = newCanvasWidth;
        this.canvasHeight = this.canvasWidth * 0.6;

        this.ctx.canvas.width = this.canvasWidth;
        this.ctx.canvas.height = this.canvasHeight;

        this.pixelX = this.canvasWidth / this.maxCoordX;
        this.pixelY = this.canvasHeight / this.maxCoordY;
    };

    this.initPictures = function() {
        var images = {};
        $('#images img').each(function(e){
            images[this.title] = this;
        });
        return images;
    };

    this.startFight = function(fight)
    {
        this.tick = 0;
        this.fight = fight;
        this.gamestate = 'fighting';

        if (this.fight.leftPlayer.id === this.me.id) {
            this.me = this.fight.leftPlayer;
            this.other = this.fight.rightPlayer;
        }
        else {
            this.me = this.fight.rightPlayer;
            this.other = this.fight.leftPlayer;
        }
    };

    this.socketInit = function () {
        // Fight initialization messages
        this.socket.on('fightReceiveChallenge', function(opponent) {
            if (!game.identified || !game.wantToFight || game.gamestate === 'fighting')
                return;

            if (confirm(opponent.pseudo + "(" + opponent.score + ") te défi ! Relèves-tu son défi ?")) {
                let id = this.me.id;
                let enemyId = opponent.id;
                let token = prompt("Entrez le token de votre combat", '111');
                game.socket.emit('tryStartFight', {
                    fightId: enemyId,
                    playerId: id,
                    token: token
                });
            }
        });

        this.socket.on('startFight', function(fight){ game.startFight(fight); });

        this.socket.on('fightUpdate', function(data) {
            if (game.gamestate === 'lobby') {
                if (data.fight) {
                    console.log('deleting fight because player is in lobby');
                    delete data.fight;
                }
                return;
            }
            if (data.fight !== undefined) {
                console.log('full updating fight');
                game.fight = data.fight;
                if (game.fight.leftPlayer.id === game.me.id) {
                    game.me = game.fight.leftPlayer;
                    game.other = game.fight.rightPlayer;
                }
                else if (game.fight.rightPlayer.id === game.me.id) {
                    game.me = game.fight.rightPlayer;
                    game.other = game.fight.leftPlayer;
                }
                else {
                    console.log("Received fight info where the player isn't present");
                    console.log(game.fight);
                    console.log(game.me);
                }
            }
            if (data['leftPlayerLife'] !== undefined) {
                game.fight.leftPlayer.life -= data['leftPlayerLife'];
                game.fight.leftPlayer.nextMove = game.tick + game.framerate * 0.3;
                game.fight.leftPlayer.state = 'hurt';
            }
            if (data['rightPlayerLife'] !== undefined) {
                game.fight.rightPlayer.life -= data['rightPlayerLife'];
                game.fight.rightPlayer.nextMove = game.tick + game.framerate * 0.3;
                game.fight.rightPlayer.state = 'hurt';
            }
            if (data.leftPlayerMove !== undefined) {
                game.fight.leftPlayer.x += data.leftPlayerMove;
            }
            if (data.rightPlayerMove !== undefined) {
                game.fight.rightPlayer.x += data.rightPlayerMove;
            }
            if (data.rightPlayerState !== undefined) { // TODO rendre joli
                game.fight.rightPlayer.state = data.rightPlayerState;
            }
            if (data.leftPlayerState !== undefined) {
                game.fight.leftPlayer.state = data.leftPlayerState;
            }
            if (data.leftPlayerNextMove !== undefined) {
                game.fight.leftPlayer.nextMove = game.tick + parseInt(
                    parseFloat(data.leftPlayerNextMove) * game.framerate);
            }
            if (data.rightPlayerNextMove !== undefined) {
                game.fight.rightPlayer.nextMove = game.tick + parseInt(
                    parseFloat(data.rightPlayerNextMove) * game.framerate);
            }
            if (data.leftPlayerGravityPos !== undefined) {
                game.fight.leftPlayer.x = data.leftPlayerGravityPos.x;
                game.fight.leftPlayer.y = data.leftPlayerGravityPos.y;
            }
            if (data.rightPlayerGravityPos !== undefined) {
                game.fight.rightPlayer.x = data.rightPlayerGravityPos.x;
                game.fight.rightPlayer.y = data.rightPlayerGravityPos.y;
            }
            if (data.leftPlayerCrouched !== undefined) {
                game.fight.leftPlayer.crouched = data.leftPlayerCrouched;
            }
            if (data.rightPlayerCrouched !== undefined) {
                game.fight.rightPlayer.crouched = data.rightPlayerCrouched;
            }
            if (data['leftPlayerSetGravity'] !== undefined) {
                game.fight.leftPlayer.velocity = data['leftPlayerSetGravity'];
                game.fight.leftPlayer.y -= data['leftPlayerSetGravity'].y;
            }
            if (data['rightPlayerSetGravity'] !== undefined) {
                game.fight.rightPlayer.velocity = data['rightPlayerSetGravity'];
                game.fight.rightPlayer.y -= data['rightPlayerSetGravity'].y;
            }
        });

        this.socket.on('fightFinish', function(data) {
            alert('fin du combat !');
            game.gamestate = 'lobby';
            delete game.fight;
        });
    };

    this.initKeyPress = function() {
        var pressedKeys = {};
        var keysCount = 0;
        var interval = null;
        let trackedKeys = {
                37: true,   // left arrow
                38: true,   // up arrow
                39: true,   // right arrow
                40: true,   // down arrow
                65: true,   // a
                90: true,   // z
                69: true,   // e
            };

        $(document).keydown(function (event) {
            let keyCode = event.which;

            if (trackedKeys[keyCode]) {
                if (!pressedKeys[keyCode]) {
                    pressedKeys[keyCode] = true;
                    keysCount++;
                }

                if (interval === null) {
                    interval = setInterval(function () {
                        if (game.me.state === 'hurt' && game.me.y !== 600) {
                            return;
                        }

                        var action = {
                            action: '',
                            fightId: game.fight.fightId,
                            player: (game.fight.leftPlayer.id === game.me.id ? 'left' : 'right')
                        };

                        if (pressedKeys[69] && game.me.nextMove < game.tick) {
                            game.me.state = 'block';
                            action.action = 'block';
                            action.block = true;
                            game.socket.emit('fightAction', action);
                        }

                        if (pressedKeys[90] && game.me.nextMove < game.tick) {
                            game.me.state = 'kick';
                            game.me.nextMove = game.tick + game.framerate * 0.7;
                            action.action = 'kick';
                            game.socket.emit('fightAction', action);
                        }

                        if (pressedKeys[65] && game.me.nextMove < game.tick) {
                            game.me.state = 'punch';
                            game.me.nextMove = game.tick + game.framerate * 0.35;
                            action.action = 'attack';
                            game.socket.emit('fightAction', action);
                        }

                        var movement = 0;
                        if (pressedKeys[37] && game.me.state === 'idle' && game.me.y === 600) --movement;
                        if (pressedKeys[39] && game.me.state === 'idle' && game.me.y === 600) ++movement;
                        if (movement !== 0) {
                            console.log(movement);
                            let distance = Math.abs(game.me.x + movement - game.other.x);
                            if (distance > 70 && game.me.x + movement > 0 && game.me.x + movement < 1000) {
                                action.action = 'move';
                                action.direction = movement;
                                game.socket.emit('fightAction', action);
                            }
                        }

                        if (pressedKeys[38] && game.me.state === 'idle' && game.me.y === 600) {
                            game.me.velocity = {x: movement, y: 4};
                            game.me.y -= game.me.velocity.y;
                            action.action = 'jump';
                            action.velocity = game.me.velocity;
                            game.socket.emit('fightAction', action);
                        }
                        else if (pressedKeys[40] && game.me.state === 'idle' && game.me.y === 600 && !game.me.crouched) {
                            action.action = 'crouch';
                            action.crouched = game.me.crouched = true;
                            game.socket.emit('fightAction', action)
                        }

                    }, game.frameTime);
                }
            }
        });

        $(document).keyup(function (event) {
            var keyCode = event.which;

            if (keyCode === 40 && game.me.state !== 'hurt' && game.me.crouched) {
                var action = {
                    fightId: game.fight.fightId,
                    player: (game.fight.leftPlayer.id === game.me.id ? 'left' : 'right'),
                    action: 'crouch',
                    crouched: game.me.crouched = false
                };
                game.socket.emit('fightAction', action)
            }
            else if (keyCode === 69  && game.me.state === 'block') {
                var action = {
                    fightId: game.fight.fightId,
                    player: (game.fight.leftPlayer.id === game.me.id ? 'left' : 'right'),
                    action: 'block',
                    block: game.me.block = false
                };
                game.socket.emit('fightAction', action)
            }

            if (pressedKeys[keyCode]) {
                delete pressedKeys[keyCode];
                keysCount--;
            }

            // need to check if keyboard movement stopped
            if ((trackedKeys[keyCode]) && (keysCount === 0)) {
                clearInterval(interval);
                interval = null;
            }
        });
    };

    this.matchmaking = function() {
        console.log("lfg");
        this.gamestate = "lfg";

        // Placeholder TODO vrai matchmaking
        let index = prompt('Id de l\'opposant : ', '1');
        let opponent = this.mainContext.app.players[index];
        console.log('proposing fight to ' + opponent.pseudo);
        this.proposeFight(opponent.id);
    };

    this.proposeFight = function(id)
    {
        this.socket.emit('fightChallenge', id)
    };

    this.clickHandle = function(event)
    {
        let clickX = event.pageX / this.pixelX;
        let clickY = event.pageY / this.pixelY;

        console.log(clickX + ":" + clickY);
        if (this.gamestate === "lobby" && this.identified)
        {
            if (clickX > 350 && clickX < 650 && clickY > 250 && clickY < 350)
                this.matchmaking();
        }
    };

    this.writeLines = function(lines, style = 'stroke', color = '#000000'){
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(lines[0].x * this.pixelX, lines[0].y * this.pixelY);
        for (var i = 1; i < lines.length; ++i) {
            this.ctx.lineTo(lines[i].x * this.pixelX, lines[i].y * this.pixelY);
        }

        if (style === 'fill') this.ctx.fill();
        else this.ctx.stroke();

        this.ctx.closePath();
    };

    this.writeText = function(txt, x, y, size, hex = '#000000', style = 'fill', align = 'center') {
        let fontSize = size * this.pixelX;
        this.ctx.font = fontSize + "px Arial";
        this.ctx.fillStyle = hex;

        this.ctx.textAlign = align;

        if (style === 'fill') this.ctx.fillText(txt, x * this.pixelX, y * this.pixelY);
        else this.ctx.strokeText(txt, x * this.pixelX, y * this.pixelY);
    };

    this.writePicture = function(picture, x, y, width, height, reverse = false) {
        /*if (this.flipped !== reverse) {
            this.flipped = !this.flipped;
            this.ctx.scale(-1, 1);
        }*/
        //if (reverse) this.ctx.scale(-1, 1); // TODO debug
        this.ctx.drawImage(
            picture,
            x * this.pixelX,
            y * this.pixelY,
            width * this.pixelX,
            height * this.pixelY
        );
    };

    this.writePlayer = function(player) {
        let height = player.crouched ? 100 : 200;
        this.writeLines([
            {x: player.x - 30, y: player.y},
            {x: player.x + 30, y: player.y},
            {x: player.x + 30, y: player.y - height},
            {x: player.x - 30, y: player.y - height},
            {x: player.x - 30, y: player.y}
        ], 'fill', player === game.me ? '#00bd04' : '#bd1300');

        var pic = game.images.fighting;
        if (player.state === 'punch') pic = game.images.punch;
        else if (player.state === 'hurt') pic = game.images.hurt;
        else if (player.state === 'kick') pic = game.images.kick;
        else if (player.state === 'block') pic = game.images.blocking;

        var widthExtra = 0;
        if (player.state === 'punch') widthExtra = 60;
        if (player.state === 'kick') widthExtra = 120;


        this.writePicture(pic, player.x - 30, player.y - height, 60 + widthExtra, height, false);

        if ((player.y !== 600 && player.state === 'hurt') || player.nextMove - game.tick > 0) {
            this.writeText(
                player.nextMove - game.tick,
                player.x,
                player.y - 220,
            );
        }
        else
            player.state = 'idle';
    };

    this.calculateGravity = function(player) {
        // TODO change left by me
        let left = player;

        let distance = Math.abs(game.me.x + left.velocity.x - game.other.x);
        if (left.x + left.velocity.x > 1000 || left.x + left.velocity.x < -1000 || distance < 70) {
            left.velocity.x = 0;
        }
        else
            left.x += left.velocity.x;

        if (left.y < 600) {
            left.velocity.y -= (game.frameTime / 1000) * 5.5;
            left.y -= left.velocity.y;
            game.socket.emit('fightAction', {
                action: 'gravity',
                fightId: game.fight.fightId,
                player: (game.fight.leftPlayer.id === game.me.id ? 'left' : 'right'),
                velocity: left.velocity
            });
        }
        else if (left.y >= 600) {
            left.y = 600;
            left.velocity = {x: 0, y: 0};
            game.socket.emit('fightAction', {
                action: 'gravityFloor',
                fightId: game.fight.fightId,
                player: (left.id === game.fight.leftPlayer.id ? 'left' : 'right')
            });
        }
    };

    this.writeLifes = function()
    {
        let lPlayerPourcentage = this.fight.leftPlayer.life / this.fight.leftPlayer.maxLife;
        this.writeLines([
            {x: 490, y: 10},
            {x: (490 - (480 * lPlayerPourcentage)), y: 10},
            {x: (490 - (480 * lPlayerPourcentage)), y: 60},
            {x: 490, y: 60},
            {x: 490, y: 10},
        ], 'fill', '#00bd04');
        this.writeLines([
            {x: 10, y: 10},
            {x: 490, y: 10},
            {x: 490, y: 60},
            {x: 10, y: 60},
            {x: 10, y: 10},
        ], 'stroke');
        this.writeText(this.fight.leftPlayer.pseudo, 480, 45, 30, '#000000', 'fill', 'right');
        let rPlayerPourcentage = this.fight.rightPlayer.life / this.fight.rightPlayer.maxLife;

        this.writeLines([
            {x: 510, y: 10},
            {x: (510 + (480 * rPlayerPourcentage)), y: 10},
            {x: (510 + (480 * rPlayerPourcentage)), y: 60},
            {x: 510, y: 60},
            {x: 510, y: 10},
        ], 'fill', '#00bd04');
        this.writeLines([
            {x: 510, y: 10},
            {x: 990, y: 10},
            {x: 990, y: 60},
            {x: 510, y: 60},
            {x: 510, y: 10},
        ], 'stroke');
        this.writeText(this.fight.rightPlayer.pseudo, 520, 45, 30, '#000000', 'fill', 'left');
    };

    this.writeMenu = function()
    {
        this.ctx.beginPath();
        this.ctx.moveTo(10, 10);
        this.ctx.lineTo(500, 500);
        this.ctx.lineTo(200, 600);
        this.ctx.stroke();
        this.ctx.closePath();

        this.writeText('Combat Rapide', 500, 310, 34);
        this.writeLines([
            {x: 350, y: 250},
            {x: 650, y: 250},
            {x: 650, y: 350},
            {x: 350, y: 350},
            {x: 350, y: 250}
        ]);
    };

    this.writeLFG = function()
    {
        let fontSize = 34 * this.pixelX;
        this.ctx.font = fontSize + "px Arial";
        this.ctx.fillText("Recherche d'un adversaire", 295 * this.pixelX, 310 * this.pixelY);

        if (this.secondsSinceStart % 3 === 0)
            this.ctx.fillText(".", 480 * this.pixelX, 360 * this.pixelY);
        else if (this.secondsSinceStart % 3 === 1)
            this.ctx.fillText("..", 480 * this.pixelX, 360 * this.pixelY);
        else if (this.secondsSinceStart % 3 === 2)
            this.ctx.fillText("...", 480 * this.pixelX, 360 * this.pixelY);
    };

    this.writeDefault = function() {
        let fontSize = 34 * this.pixelX;
        this.ctx.font = fontSize + "px Arial";
        this.ctx.fillText("Erreur dans le chargement de JS Fight (état inconnu)", 0, 100 * this.pixelY);
    };

    this.canvasLoop = function()
    {
        if (this.tick === Number.MAX_VALUE) this.tick = -1;
        ++this.tick;

        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

        if (!this.identified) {
            this.writeDefault();
            return;
        }

        if (this.gamestate === "lobby") this.writeMenu();
        else if (this.gamestate === "lfg") this.writeLFG();
        else if (this.gamestate === 'fighting'){
            if (game.nextFightupdate < game.tick) {
                game.nextFightupdate += game.framerate * 2;
                game.socket.emit('fightAskUpdate', game.fight.fightId);
            }
            this.calculateGravity(game.me);
            this.writeLifes();
            //this.writePlayers();
            this.writePlayer(game.me);
            this.writePlayer(game.other);
        }
        else this.writeDefault();
    };

    var game = this;

    this.mainContext = main;
    this.ctx = canvas.getContext('2d');
    this.framerate = 60;
    this.frameTime = 1000 / this.framerate;

    this.canvasWidth = 0;
    this.canvasHeight = 0;

    this.maxCoordX = 1000;
    this.maxCoordY = this.maxCoordX * 0.6;

    this.pixelX;
    this.pixelY;
    this.images = this.initPictures();
    this.flipped = false; // TODO debug

    this.identified = false;
    this.wantToFight = true;
    this.gamestate = "lobby";
    this.tick = 0;
    this.secondsSinceStart = 0;

    this.socket;
    this.me;
    this.other;

    this.fight;
    this.nextFightupdate = 0;

    this.socket = main.socket;
    this.initKeyPress();

    this.resizeCanvas();
    //setInterval(function(){ game.resizeCanvas(); }, 300);
    setInterval(function(){ game.canvasLoop(); }, this.frameTime);
    setInterval(function(){ ++game.secondsSinceStart; }, 1000);
    canvas.addEventListener('click', function(event){ game.clickHandle(event); });
}