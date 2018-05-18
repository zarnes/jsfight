let app = require('express')();
let http = require('http').Server(app);
let fs = require('fs');

app.get('*.js', function(req, res, next) {
    console.log('loading js file : .' + req.url);
    fs.readFile("./client/" + req.url.toString(), function(err, data) {
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

app.get('*.css', function(req, res, next) {
    console.log('loading css file : .' + req.url);
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