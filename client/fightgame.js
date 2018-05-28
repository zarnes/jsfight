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

        if (this.fight.leftPlayer.id === this.me.id) this.me = this.fight.leftPlayer;
        else this.me = this.fight.rightPlayer;
    };

    this.socketInit = function () {
        this.socket = io.connect("http://localhost");

        // Connection messages
        this.socket.on('connection', function(err) { game.socketConnection(err); });
        this.socket.on('fightNotificationIdentified', function (err) {
            if (err) {
                console.log('Can\'t be identified : ' + err);
                game.me = null;
            }
            else {
                game.identified = true;
            }
        });

        // General messages
        this.socket.on('message', function(message) { console.log('Message from server : ' + message); });

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
                console.log('updating fight');
                if (game.fight.leftPlayer.id == game.me.id) {
                    game.me = game.fight.leftPlayer;
                }
                else if (game.fight.rightPlayer.id == game.me.id) {
                    game.me = game.fight.rightPlayer;
                }
                else {
                    console.log("Received fight info where the player isn't present");
                    console.log(game.fight);
                    console.log(game.me);
                }
            }
            if (data.leftPlayerLife !== undefined) {
                game.fight.leftPlayer.life -= data.leftPlayerLife;
            }
            if (data.rightPlayerLife !== undefined) {
                game.fight.rightPlayer.life -= data.rightPlayerLife;
            }
            if (data.leftPlayerMove !== undefined) {
                game.fight.leftPlayer.x += data.leftPlayerMove;
            }
            if (data.rightPlayerMove !== undefined) {
                game.fight.rightPlayer.x += data.rightPlayerMove;
            }
        });
    };

    function initKeyPress() {
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
                            game.me.nextMove = game.tick + game.ticksPerSecond * 0.5;
                            action.action = 'attack';
                            game.socket.emit('fightAction', action);
                        }

                        var movement = 0;
                        if (pressedKeys[37]) --movement;
                        if (pressedKeys[39]) ++movement;
                        if (movement !== 0) {
                            action.action = 'move';
                            action.direction = movement;
                            game.socket.emit('fightAction', action)
                        }

                    }, game.ticksPerSecond);
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

    this.writeText = function(text, x, y, size, color = '#000000', style = 'fill', align = 'center') {
        let fontSize = size * this.pixelX;
        this.ctx.font = fontSize + "px Arial";

        this.ctx.textAlign = align;

        if (style === 'fill') this.ctx.fillText(text, x * this.pixelX, y * this.pixelY);
        else this.ctx.strokeText(text, x * this.pixelX, y * this.pixelY);
    };

    this.writePlayers = function() {
        this.writeLines([
            {x: game.fight.leftPlayer.x - 30, y: game.fight.leftPlayer.y},
            {x: game.fight.leftPlayer.x + 30, y: game.fight.leftPlayer.y},
            {x: game.fight.leftPlayer.x + 30, y: game.fight.leftPlayer.y - 200},
            {x: game.fight.leftPlayer.x - 30, y: game.fight.leftPlayer.y - 200},
            {x: game.fight.leftPlayer.x - 30, y: game.fight.leftPlayer.y}
        ], 'fill', '#00bd04');

        this.writeLines([
            {x: game.fight.leftPlayer.x + 30, y: game.fight.leftPlayer.y - 130},
            {x: game.fight.leftPlayer.x + 100, y: game.fight.leftPlayer.y - 130},
            {x: game.fight.leftPlayer.x + 100, y: game.fight.leftPlayer.y - 170},
            {x: game.fight.leftPlayer.x + 30, y: game.fight.leftPlayer.y - 170},
            {x: game.fight.leftPlayer.x + 30, y: game.fight.leftPlayer.y - 160}
        ], 'fill', '#004101');

        this.writeLines([
            {x: game.fight.rightPlayer.x - 30, y: game.fight.rightPlayer.y},
            {x: game.fight.rightPlayer.x + 30, y: game.fight.rightPlayer.y},
            {x: game.fight.rightPlayer.x + 30, y: game.fight.rightPlayer.y - 200},
            {x: game.fight.rightPlayer.x - 30, y: game.fight.rightPlayer.y - 200},
            {x: game.fight.rightPlayer.x - 30, y: game.fight.rightPlayer.y}
        ], 'fill', '#bd1300');
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
            if (game.nextFightupdate < game.tick) {
                console.log('asking for update');
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
    this.ticksPerSecond = 1000 / this.framerate;

    this.canvasWidth = 0;
    this.canvasHeight = 0;

    this.maxCoordX = 1000;
    this.maxCoordY = this.maxCoordX * 0.6;

    this.pixelX;
    this.pixelY;

    this.identified = false;
    this.wantToFight = true;
    this.gamestate = "lobby";
    this.tick = 0;
    this.secondsSinceStart = 0;

    this.socket;
    this.me;

    this.fight;
    this.nextFightupdate = 0;

    this.socketInit();
    initKeyPress();

    this.resizeCanvas();
    setInterval(function(){ game.resizeCanvas(); }, 300);
    setInterval(function(){ game.canvasLoop(); }, this.ticksPerSecond);
    setInterval(function(){ ++game.secondsSinceStart; }, 1000);
    canvas.addEventListener('click', function(event){ game.clickHandle(event); });
}