const express = require('express')
const http = require('http')
const WebSocket = require('ws')
const bodyParser = require('body-parser')
const crypto = require('crypto-js')

const connection = require('./lib/database/mongo')
const { Appliance } = require('./lib/database/models/appliances')
const { Auth } = require('./lib/database/models/auth')

const { firebaseAuth } = require('./lib/firebase')

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

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

app.post('/login', (req, res) => {
    let time = Date()
    firebaseAuth.signInWithEmailAndPassword(req.body.email, req.body.password)
        .then(() => {
            let token = crypto.MD5('/AzIm/' + req.body.email + '*' + req.body.password + '*' + time.toString() + '/AyEsha/')
            let authToken = new Auth({ token: token, date: time, valid: true })
            authToken.save()
                .then(savedToken => {
                    console.log("New login detected")
                    res.json({ authenticated: true, token: token, valid })
                })
                .catch((err) => {
                    console.log("Database save failed")
                    res.json({ authenticated: false, token: null })
                })
        })
        .catch(() => {
            console.log("Sign in failed")
            res.json({ authenticated: false, token: null })
        })
})

app.post('/appliance', (req, res) => {
    Appliance.find({}, (err, result) => {
        if (err) {
            res.json({ type: "error", data: [] })
        } else {
            res.json({ type: "success", data: result })
        }
    })
})

app.post('/applianceToggle', (req, res) => {
    Auth.find({ token: req.body.token }, (err, res) => {
        if (err) {
            res.json({ status: "Auth Failed" })
        } else if (res.length > 0) {
            if (res[0].valid) {
                if (wss.clients.length > 0) {
                    wss.clients.forEach(client => {
                        client.send(`{
                            "type":"${req.body.payload.action}", 
                            "id":"${req.body.payload.appliance.id}",
                            "pin": "${req.body.appliance.pin}"
                        }`)
                    })
                    res.json({ status: "SUCCESS" })
                } else {
                    res.json({ status: "No client found" })
                }

            } else {
                res.json({ status: "Auth Failed" })
            }
        } else {
            res.json({ status: "Auth Failed" })
        }
    })
})

app.get('/ping', (req, res) => {
    res.send("pong")
})


server.listen(process.env.PORT || 6969, () => {
    console.log(`Server started on port ${server.address().port}`);
});