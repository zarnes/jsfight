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

    this.socketConnection = function (err) {
        if (err) {
            console.log("Error from connection : " + err);
            return;
        }
        console.log('Connected with socket to server');
        let index = prompt("Index de votre pseudo", '0');
        if (!index) return;

        let identity = this.mainContext.app.players[index];
        if (!identity) return;

        this.me = identity;
        this.socket.emit('fightGiveIdentity', identity)
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
            if (data.fight !== undefined) {
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
            if (data.leftPlayerLife !== undefined) {
                game.fight.leftPlayer.life -= data.leftPlayerLife;
                game.fight.leftPlayer.nextMove = game.tick + game.framerate * 0.3;
                game.fight.leftPlayer.state = 'hurt';
            }
            if (data.rightPlayerLife !== undefined) {
                game.fight.rightPlayer.life -= data.rightPlayerLife;
                game.fight.rightPlayer.nextMove = game.tick + game.framerate * 0.3;
                game.fight.rightPlayer.state = 'hurt';
            }
            if (data.leftPlayerMove !== undefined) {
                game.fight.leftPlayer.x += data.leftPlayerMove;
            }
            if (data.rightPlayerMove !== undefined) {
                game.fight.rightPlayer.x += data.rightPlayerMove;
            }
            if (data.rightPlayerState !== undefined) {
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
        });
    };

    function initKeyPress() { // TODO change name
        var pressedKeys = {};
        var keysCount = 0;
        var interval = null;
        let trackedKeys = {
                37: true,   // left arrow
                38: true,   // up arrow
                39: true,   // right arrow
                40: true,   // down arrow
                65: true,   // a
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
                        var action = {
                            fightId: game.fight.fightId,
                            player: (game.fight.leftPlayer.id === game.me.id ? 'left' : 'right')
                        };
                        if (pressedKeys[65] && game.me.nextMove < game.tick) {
                            game.me.state = 'punch';
                            game.me.nextMove = game.tick + game.framerate * 0.35;
                            action.action = 'attack';
                            game.socket.emit('fightAction', action);
                        }

                        var movement = 0;
                        if (pressedKeys[37] && game.me.state === 'idle') --movement;
                        if (pressedKeys[39] && game.me.state === 'idle') ++movement;
                        if (movement !== 0) {
                            let distance = Math.abs(game.me.x + movement - game.other.x);
                            if (distance > 70) {
                                action.action = 'move';
                                action.direction = movement;
                                game.socket.emit('fightAction', action);
                            }
                        }

                        if (pressedKeys[38] && game.me.y === 600) {
                            console.log('jump');
                            game.me.velocity = {x: movement, y: 2};
                            game.me.y -= 1;
                        }

                    }, game.frameTime);
                }
            }
        });

        $(document).keyup(function (event) {
            var keyCode = event.which;

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
    }

    this.matchmaking = function() {
        console.log("lfg");
        this.gamestate = "lfg";

        // Placeholder
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
        //if (reverse) this.ctx.scale(-1, 1);
        this.ctx.drawImage(
            picture,
            x * this.pixelX,
            y * this.pixelY,
            width * this.pixelX,
            height * this.pixelY
        );
    };

    this.writePlayers = function() {
        let left = game.fight.leftPlayer;
        this.writeLines([
            {x: left.x - 30, y: left.y},
            {x: left.x + 30, y: left.y},
            {x: left.x + 30, y: left.y - 200},
            {x: left.x - 30, y: left.y - 200},
            {x: left.x - 30, y: left.y}
        ], 'fill', '#00bd04');

        var pic = game.images.fighting;
        if (left.state === 'punch') pic = game.images.punch;
        else if(left.state === 'hurt') pic = game.images.hurt;
        let widthExtra = (left.state === 'punch' ? 55 : 0);
        this.writePicture(pic, left.x - 30, left.y - 200, 60 + widthExtra, 200, true);

        if (left.nextMove - game.tick > 0) {
            this.writeText(
                left.nextMove - game.tick,
                left.x,
                left.y - 220,
            );
        }
        else
            left.state = 'idle';


        let right = game.fight.rightPlayer;
        this.writeLines([
            {x: right.x - 30, y: right.y},
            {x: right.x + 30, y: right.y},
            {x: right.x + 30, y: right.y - 200},
            {x: right.x - 30, y: right.y - 200},
            {x: right.x - 30, y: right.y}
        ], 'fill', '#bd1300');

        pic = game.images.fighting;
        if (right.state === 'punch') pic = game.images.punch;
        else if(right.state === 'hurt') pic = game.images.hurt;
        widthExtra = (right.state === 'punch' ? 60 : 0);
        this.writePicture(pic, right.x - 30, right.y - 200, 60 + widthExtra, 200, true);

        if (right.nextMove - game.tick > 0) {
            this.writeText(
                right.nextMove - game.tick,
                right.x,
                right.y - 220,
            );
        }
        else
            right.state = 'idle';
    };

    this.calculateGravity = function() {
        let left = game.fight.leftPlayer;
        let right = game.fight.rightPlayer;

        if (left.y === 600) {
            left.velocity = {x: 0, y: 0};
        }
        else {
            let velo = {
                x: left.velocity.x,
                y: left.velocity.y,
                yyy: left.y
            };
            console.log(velo);
            left.velocity.y -= (game.frameTime / 1000) * 0.5;
            game.socket.emit('fightAction', {
                player: 'left',
                move: {x: left.velocity.x * game.frameTime, y: left.velocity.frameTime * 0.2}
            });
            left.x += left.velocity.x;
            left.y -= left.velocity.y;
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
        let fontSize = 34 * this.pixelX;
        this.ctx.font = fontSize + "px Arial";
        this.ctx.fillText("Combat rapide", 390 * this.pixelX, 310 * this.pixelY);

        this.ctx.beginPath();
        this.ctx.moveTo(350 * this.pixelX, 250 * this.pixelY);
        this.ctx.lineTo(650 * this.pixelX, 250 * this.pixelY);
        this.ctx.lineTo(650 * this.pixelX, 350 * this.pixelY);
        this.ctx.lineTo(350 * this.pixelX, 350 * this.pixelY);
        this.ctx.lineTo(350 * this.pixelX, 250 * this.pixelY);
        this.ctx.stroke();
        this.ctx.closePath();
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
            this.calculateGravity();
            if (game.nextFightupdate < game.tick) {
                game.nextFightupdate += game.framerate * 2;
                game.socket.emit('fightAskUpdate', game.fight.fightId);
            }
            this.writeLifes();
            this.writePlayers();
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
    /*this.socket.on('connection', function(err){
        this.socketInit();
    });*/
    initKeyPress();

    this.resizeCanvas();
    setInterval(function(){ game.resizeCanvas(); }, 300);
    setInterval(function(){ game.canvasLoop(); }, this.frameTime);
    setInterval(function(){ ++game.secondsSinceStart; }, 1000);
    canvas.addEventListener('click', function(event){ game.clickHandle(event); });
}