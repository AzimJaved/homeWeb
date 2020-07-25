const express = require('express')
const http = require('http')
const WebSocket = require('ws')

const app = express();

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {

    ws.on('message', (message) => {

        ws.send(`{"type":"OTHER", "data": "Hello, you sent -> ${message}"}`);
    }); 
    ws.send('{"type":"OTHER", "data":"Hi there, I am a WebSocket server"}');
});


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/pages/index.html')
})
app.get('/off', (req, res) => {
    wss.clients.forEach(client => {
        client.send(`{"type":"OFF"}`);
    })
    res.redirect('/')
})

app.get('/on', (req, res) => {
    wss.clients.forEach(client => {
        client.send(`{"type":"ON"}`);
    })
    res.redirect('/')
})

app.get('/ping', (req, res) => {
    res.send("pong")
})


server.listen(process.env.PORT || 6969, () => {
    console.log(`Server started on port ${server.address().port}`);
});