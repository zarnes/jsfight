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
        this.fight = fight;
        this.gamestate = 'fighting';
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
    };

    this.keyPressInit = function (){
        /*$(document).keypress(function(event){
            console.log('keycode : ' + event.keyCode + ', tick : ' + game.tick);
        });*/

        $(document).on('keydown', function(event){
            console.log(event.type + ' ' + event.which);
        });
        console.log('key pressing initialized');
    };

    function onKeyPress(callback) {
        var pressedKeys = {};
        var keysCount = 0;
        var interval = null;
        let trackedKeys = {
                37: true, // left arrow
                38: true, // up arrow
                39: true, // right arrow
                40: true // down arrow
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
                        var direction = '';

                        // check if north or south
                        if (pressedKeys[119] || pressedKeys[87] || pressedKeys[38]) {
                            direction = 'n';
                        } else if (pressedKeys[115] || pressedKeys[83] || pressedKeys[40]) {
                            direction = 's';
                        }

                        // concat west or east
                        if (pressedKeys[97] || pressedKeys[65] || pressedKeys[37]) {
                            direction += 'w';
                        } else if (pressedKeys[100] || pressedKeys[68] || pressedKeys[39]) {
                            direction += 'e';
                        }

                        callback(direction);
                    }, 1000 / game.framerate);
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
                callback('none');
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
        this.ctx.moveTo(lines[0].x, lines[0].y);
        for (var i = 1; i < lines.length; ++i) {
            this.ctx.lineTo(lines[i].x, lines[i].y);
        }

        if (style === 'fill') this.ctx.fill();
        else this.ctx.stroke();

        this.ctx.closePath();
    };

    this.writeLifes = function()
    {
        let lPlayerPourcentage = this.fight.leftPlayer.life / this.fight.leftPlayer.maxLife;
        let rPlayerPourcentage = this.fight.rightPlayer.life / this.fight.rightPlayer.maxLife;

        this.writeLines([
            {x: 490 * this.pixelX, y: 10 * this.pixelY},
            {x: (490 - (480 * lPlayerPourcentage)) * this.pixelX, y: 10 * this.pixelY},
            {x: (490 - (480 * lPlayerPourcentage)) * this.pixelX, y: 60 * this.pixelY},
            {x: 490 * this.pixelX, y: 60 * this.pixelY},
            {x: 490 * this.pixelX, y: 10 * this.pixelY},
        ], 'fill', '#00bd04');
        this.writeLines([
            {x: 10 * this.pixelX, y: 10 * this.pixelY},
            {x: 490 * this.pixelX, y: 10 * this.pixelY},
            {x: 490 * this.pixelX, y: 60 * this.pixelY},
            {x: 10 * this.pixelX, y: 60 * this.pixelY},
            {x: 10 * this.pixelX, y: 10 * this.pixelY},
        ], 'stroke');

        this.writeLines([
            {x: 510 * this.pixelX, y: 10 * this.pixelY},
            {x: (510 + (480 * rPlayerPourcentage)) * this.pixelX, y: 10 * this.pixelY},
            {x: (510 + (480 * rPlayerPourcentage)) * this.pixelX, y: 60 * this.pixelY},
            {x: 510 * this.pixelX, y: 60 * this.pixelY},
            {x: 510 * this.pixelX, y: 10 * this.pixelY},
        ], 'fill', '#00bd04');
        this.writeLines([
            {x: 510 * this.pixelX, y: 10 * this.pixelY},
            {x: 990 * this.pixelX, y: 10 * this.pixelY},
            {x: 990 * this.pixelX, y: 60 * this.pixelY},
            {x: 510 * this.pixelX, y: 60 * this.pixelY},
            {x: 510 * this.pixelX, y: 10 * this.pixelY},
        ], 'stroke');

        /*this.ctx.beginPath();
        this.ctx.moveTo(510 * this.pixelX, 10 *this.pixelY);
        this.ctx.lineTo(990 * this.pixelX, 10 * this.pixelY);
        this.ctx.lineTo(990 * this.pixelX, 60 * this.pixelY);
        this.ctx.lineTo(510 * this.pixelX, 60 * this.pixelY);
        this.ctx.lineTo(510 * this.pixelX, 10 * this.pixelY);
        this.ctx.stroke();
        this.ctx.closePath();*/
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
            this.writeLifes();
        }
        else this.writeDefault();
    };

    var game = this;

    this.mainContext = main;
    this.ctx = canvas.getContext('2d');
    this.framerate = 60;

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

    this.socketInit();
    //this.keyPressInit();
    onKeyPress(function(event){
        console.log(event);
    });

    this.resizeCanvas();
    setInterval(function(){ game.resizeCanvas(); }, 300);
    setInterval(function(){ game.canvasLoop(); }, 1000 / this.framerate);
    setInterval(function(){ ++game.secondsSinceStart; }, 1000);
    canvas.addEventListener('click', function(event){ game.clickHandle(event); });
}