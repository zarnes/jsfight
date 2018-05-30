let app = require('express')();
let session = require('express-session');
let http = require('http').Server(app);

let fs = require('fs');
let bodyParser = require('body-parser');
let io = require('socket.io').listen(http);

let mongoServer = require('mongodb');

let fightGame = require("./server/fightgame").data;
let chat = require("./server/chat").data;

let mongo = {
    server: mongoServer,
    client: mongoServer.MongoClient,
    url: "mongodb://localhost:27017/",
    db: {},
    objectId: mongoServer.ObjectId,
};
var sockets = {};
var connectedPlayers = {};
var disconnectedPlayers = {};

/*
*   TODO
*   mirorring des anim
*   block dans le fight
*   matchmaking
 */

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'sessionSecret'
}));

io.sockets.on('connection', function(socket) {
    socket.player = {
        identified: false
    };

    socket.emit('connection', '');

    socket.on('message', function(message){
        var sender = '';
        if (socket.player.identified)
            sender = socket.player.identity.pseudo;
        else
            sender = 'An unidentified client';
        console.log(sender + ' say : ' + message);
    });

    socket.on('fightGiveIdentity', function(player) {
        if (!connectedPlayers[player._id]) {
            console.log('Disconnecting ' + player.pseudo + '\'s socket because he\'s not connected');
            socket.disconnect();
        }
        socket.player.identified = true;
        socket.player.identity = player;
        socket.player.identity.id = socket.player.identity._id;
        socket.emit('message', 'Vous avez été identifié en tant que ' + socket.player.identity.pseudo);
        socket.emit('fightNotificationIdentified', '');
        sockets[socket.player.identity.id] = socket;
        console.log('Connected to ' + socket.player.identity.pseudo + ' with socket');
        Object.keys(sockets).map(function(objectKey, index) {
            let socket = sockets[objectKey];
            socket.emit("update players", '');
        });
    });

    socket.on('disconnect', function(){
        if (socket.player.identified) {
            console.log(socket.player.identity.pseudoClass + ' disconnected.');

            disconnectedPlayers[socket.player.identity.id] = true;
            delete connectedPlayers[socket.player.identity.id];
            delete connectedPlayers[socket.player.identity.id];

            Object.keys(sockets).map(function(objectKey, index) {
                let socket = sockets[objectKey];
                socket.emit("update players", '');
            });
        }
    })
});

mongo.client.connect(mongo.url, function(err, db) {
    if (err) {
        mongo.db.jsFight = false;
        console.log('Js Fight mongo db not initialized !');
    }
    else {
        mongo.db.jsFight = db.db('JsFight');
        console.log('Js Fight mongo db initialized');
        
    }

    fightGame.init(http, mongo, io, sockets);
    chat.init(io,sockets);
});

app.get('*.js', function(req, res) {
    var url = req.url;

    if (url === '/fight.js') url = './shared/' + url;
    else url = './client/' + url;

    fs.readFile(url.toString(), function(err, data) {
        if (err)
        {
            console.log(err);
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('Error reading file');
        }
        else
        {
            res.writeHead(200, {'Content-Type': 'text/javascript'});
            res.end(data);
        }
    })
});

app.get('*.css', function(req, res) {
    fs.readFile("./client/" + req.url.toString(), function(err, data) {
        if (err)
        {
            console.log(err);
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('Error reading file');
        }
        else
        {
            res.writeHead(200, {'Content-Type': 'text/css'});
            res.end(data);
        }
    });
});

app.get('*.png', function(req, res) {
    fs.readFile("./client/" + req.url.toString(), function(err, data) {
        if (err)
        {
            console.log(err);
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('Error reading file');
        }
        else
        {
            res.writeHead(200, {'Content-Type': 'image/png'});
            res.end(data);
        }
    });
});

app.get('/', function(req, res){
    fs.readFile('client/login.html', function(err, data){
        if (err) {
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.end('Error reading login page');
        }
        else
        {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(data);
        }
    });
});

app.post('/login', function(req, res){
    mongo.db.jsFight.collection('Access').findOne(
        {"mail": req.body.fname, $and: [ { "password": req.body.password }]}
        , function (err, result) {
            if(result == null){
                res.redirect('/');
                return false;
            }else if (result != null){
                mongo.db.jsFight.collection('User').findOne({
                    '_id': mongo.objectId(result.playerId)
                }, function(err, result){
                    if (!err && result) {
                        req.session.identified = true;
                        req.session.player = result;
                        console.log(result.pseudo + ' is connected');
                        connectedPlayers[result._id] = true;
                        res.redirect('/lobby')
                    }
                    else
                        res.redirect('/');
                });
            }
        });
});

app.get('/register', function(req, res){
    fs.readFile('client/register.html', function(err, data){
        if (err) {
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.end('Error reading login page');
        }
        else
        {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(data);
        }
    });
});

app.get('/lobby', function(req, res) {
    if (!req.session.identified){
        res.redirect('/');
        return;
    }

    if (req.session.identified && disconnectedPlayers[req.session.player._id]) {
        req.session.identified = false;
        res.redirect('/');
        delete disconnectedPlayers[req.session.player._id];
        return;
    }

    fs.readFile('client/lobby.html', function(err, data){
        if (err) {
            console.log(err);
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('Error reading lobby page');
        }
        else
        {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(data);
        }
    })
});

app.get('/vuedata', function(req, res) {
    var appData = {
        me: req.session.player,
        serverIp: 'localhost'
    };

    mongo.db.jsFight.collection('User').find({}).sort({
        "score": -1
    }).toArray(function(err, result){
        if (!err && result) {
            for(var i = 0; i < result.length; ++i) {
                result[i].ladder = i+1;
                result[i].connected = (connectedPlayers[result[i]._id] === true)
            }
            appData.players = result;
            res.send(appData);
            res.end();
        }
        else {
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.end('Error reading data');
        }
    });
});


http.listen(80);
console.log('Server is listening');



