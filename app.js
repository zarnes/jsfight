let app = require('express')();
let http = require('http').Server(app);
let fs = require('fs');
let mongoServer = require('mongodb');
let fightGame = require("./server/fightgame").data;

let mongo = {
    server: mongoServer,
    client: mongoServer.MongoClient,
    url: "mongodb://localhost:27017/",
    db: {},
    objectId: mongoServer.ObjectId,
};

mongo.client.connect(mongo.url, function(err, db) {
    if (err) {
        mongo.db.jsFight = false;
        console.log('Js Fight mongo db not initialized !');
    }
    else {
        mongo.db.jsFight = db.db('JsFight');
        console.log('Js Fight mongo db initialized');
    }

    fightGame.init(http, mongo);
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

app.post('/login', function(req, res){
    // TODO add login
});

app.get('/lobby', function(req, res) {
    // TODO check login

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

http.listen(80);


