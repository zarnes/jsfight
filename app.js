let app = require('express')();
let http = require('http').Server(app);
let fs = require('fs');
let mongoServer = require('mongodb');
var assert = require('assert');
let fightGame = require("./server/fightgame").data;


let bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let chat = require("./server/chat").data;
let io = require('socket.io').listen(http);

let mongo = {
    server: mongoServer,
    client: mongoServer.MongoClient,
    url: "mongodb://localhost:27017/",
    db: {},
    objectId: mongoServer.ObjectId,
};

var url = 'mongodb://localhost:27017/JsFight';

var sockets = {};

io.sockets.on('connection', function(socket) {
    socket.player = {
        identified: false
    };

    console.log('new client connected with socket');
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
        // TODO, juste envoyer l'id ?
        socket.player.identified = true;
        socket.player.identity = player;
        socket.emit('message', 'Vous avez été identifié en tant que ' + socket.player.identity.pseudo);
        socket.emit('fightNotificationIdentified', '');
        sockets[socket.player.identity.id] = socket;
    });
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
    /*mongo.db.jsFight.collection('User').findOne({
        _id: mongo.objectId('5b02dcd58898a535ec9705ab'),
    }, function(err, result){
        console.log(result);
    });*/
});



app.get('*.js', function(req, res) {
    //console.log('loading js file : .' + req.url);
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
    //console.log('loading css file : .' + req.url);
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
    //console.log('loading css file : .' + req.url);
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
    console.log("logging");
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

app.post('/login', function(req, res) {
    var insert = {
        mail: req.body.fname,
        password: req.body.password
    };
    mongoServer.connect(url, function (err, mongoServer) {
        assert.equal(null, err);
        mongo.db.jsFight.collection('Access').insert(insert, function (err, result) {
            assert.equal(null, err);
            console.log('Data inserted');
        });
    });

    mongo.db.jsFight.collection('Access').findOne(
        {"mail": req.body.fname, $and: [ { "password": req.body.password }]}
        , function (err, result) {
            console.log(result);
            if(result == null){
                res.redirect('/');
                return false;
            }else if (result != null){
                res.redirect('/lobby')
            }

        });
});


app.get('/register', function(req, res, next){

});


app.get('/lobby', function(req, res) {
    // TODO check login

    fs.readFile('client/lobby.html', function (err, data) {
        if (err) {
            console.log(err);
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('Error reading lobby page');
        }
        else {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(data);
        }
    });
});

    app.get('/vuedata', function (req, res) {
        // TODO Liste des joueurs avec mongo
        let data = {
            pseudo: 'Zarnes',
            serverIp: 'localhost:8080',
            players: [
                {id: '5b02dcc48898a535ec9705aa', pseudo: 'Zarnes', ladder: '1', score: '1000', connected: 'true'},
                {id: '5b02dcd58898a535ec9705ab', pseudo: 'Senraz', ladder: '2', score: '999', connected: 'true'},
            ]
        };
        //res.writeHead(200, {'Content-Type': 'application/json'});
        res.send(data);
        res.end();
    });


http.listen(8080);
