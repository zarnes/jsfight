var JsFightGame = function(canvas) {
    function resizeCanvas()
    {
        let newCanvasWidth = $('#game-zone').width();
        if (newCanvasWidth == canvasWidth) return;

        canvasWidth = newCanvasWidth;
        canvasHeight = canvasWidth * 0.6;

        ctx.canvas.width = canvasWidth;
        ctx.canvas.height = canvasHeight;

        pixelX = canvasWidth / maxCoordX;
        pixelY = canvasHeight / maxCoordY;
    }

    function proposeFight(name)
    {
        // TODO
        console.log("lfg");
        gamestate = "lfg";
    }

    function clickHandle(event)
    {
        let clickX = event.pageX / pixelX;
        let clickY = event.pageY / pixelY;

        console.log(clickX + ":" + clickY);
        if (gamestate === "lobby")
        {
            if (clickX > 350 && clickX < 650 && clickY > 250 && clickY < 350)
                proposeFight("");
        }
    }

    function writeLifes()
    {
        ctx.beginPath();
        ctx.moveTo(10 * pixelX, 10 *pixelY);
        ctx.lineTo(490 * pixelX, 10 * pixelY);
        ctx.lineTo(490 * pixelX, 60 * pixelY);
        ctx.lineTo(10 * pixelX, 60 * pixelY);
        ctx.lineTo(10 * pixelX, 10 * pixelY);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.moveTo(510 * pixelX, 10 *pixelY);
        ctx.lineTo(990 * pixelX, 10 * pixelY);
        ctx.lineTo(990 * pixelX, 60 * pixelY);
        ctx.lineTo(510 * pixelX, 60 * pixelY);
        ctx.lineTo(510 * pixelX, 10 * pixelY);
        ctx.stroke();
        ctx.closePath();
    }

    function writeMenu()
    {

    }

    function canvasLoop()
    {
        writeLifes();
    }

    function resizeCanvas()
    {
        let newCanvasWidth = $('#game-zone').width();
        if (newCanvasWidth == canvasWidth) return;

        canvasWidth = newCanvasWidth;
        canvasHeight = canvasWidth * 0.6;

        ctx.canvas.width = canvasWidth;
        ctx.canvas.height = canvasHeight;

        pixelX = canvasWidth / maxCoordX;
        pixelY = canvasHeight / maxCoordY;
    }

    function writeLifes()
    {
        ctx.beginPath();
        ctx.moveTo(10 * pixelX, 10 *pixelY);
        ctx.lineTo(490 * pixelX, 10 * pixelY);
        ctx.lineTo(490 * pixelX, 60 * pixelY);
        ctx.lineTo(10 * pixelX, 60 * pixelY);
        ctx.lineTo(10 * pixelX, 10 * pixelY);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.moveTo(510 * pixelX, 10 *pixelY);
        ctx.lineTo(990 * pixelX, 10 * pixelY);
        ctx.lineTo(990 * pixelX, 60 * pixelY);
        ctx.lineTo(510 * pixelX, 60 * pixelY);
        ctx.lineTo(510 * pixelX, 10 * pixelY);
        ctx.stroke();
        ctx.closePath();
    }

    function writeMenu()
    {
        let fontSize = 34 * pixelX;
        ctx.font = fontSize + "px Arial";
        ctx.fillText("Combat rapide", 390 * pixelX, 310 * pixelY);

        ctx.beginPath();
        ctx.moveTo(350 * pixelX, 250 * pixelY);
        ctx.lineTo(650 * pixelX, 250 * pixelY);
        ctx.lineTo(650 * pixelX, 350 * pixelY);
        ctx.lineTo(350 * pixelX, 350 * pixelY);
        ctx.lineTo(350 * pixelX, 250 * pixelY);
        ctx.stroke();
        ctx.closePath();
    }

    function writeLFG()
    {
        let fontSize = 34 * pixelX;
        ctx.font = fontSize + "px Arial";
        ctx.fillText("Recherche d'un adversaire", 295 * pixelX, 310 * pixelY);

        if (secondsSinceStart % 3 === 0)
            ctx.fillText(".", 480 * pixelX, 360 * pixelY);
        else if (secondsSinceStart % 3 === 1)
            ctx.fillText("..", 480 * pixelX, 360 * pixelY);
        else if (secondsSinceStart % 3 === 2)
            ctx.fillText("...", 480 * pixelX, 360 * pixelY);


    }

    function canvasLoop()
    {
        if (tick == Number.MAX_VALUE) tick = -1;
        ++tick;

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        //writeLifes();
        if (gamestate === "lobby") writeMenu();
        else if (gamestate === "lfg") writeLFG();
    }

    var ctx = canvas.getContext('2d');
    var framerate = 60;

    var canvasWidth = 0;
    var canvasHeight = 0;

    var maxCoordX = 1000;
    var maxCoordY = maxCoordX * 0.6;

    var pixelX;
    var pixelY;


    var gamestate = "lobby";
    var tick = 0;
    var secondsSinceStart = 0;

    resizeCanvas();
    setInterval(function(){ resizeCanvas(); }, 300);
    setInterval(function(){ canvasLoop(); }, 1000 / framerate);
    setInterval(function(){ ++secondsSinceStart; }, 1000);
    canvas.addEventListener('click', function(event){ clickHandle(event); });
};