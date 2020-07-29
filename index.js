const express = require('express')
const http = require('http')
const WebSocket = require('ws')
const bodyParser = require('body-parser')
const crypto = require('crypto-js')
const cors = require('cors')

const connection = require('./lib/database/mongo')
const { Appliance } = require('./lib/database/models/appliances')
const { Auth } = require('./lib/database/models/auth')

const { firebaseAuth } = require('./lib/firebase')

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())
app.use(cors())
app.options('*', cors())

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

// let newA1 = new Appliance({
//     id:"tl-01",
//     name: "Room Tubelight",
//     image: "/",
//     pin: 8,
//     lastStatus: "ON",
//     lastStatusTime: Date(),
//     type: "light"
// })
// let newA2 = new Appliance({
//     id:"bl-01",
//     name: "Balcony Light",
//     image: "/",
//     pin: 9,
//     lastStatus: "ON",
//     lastStatusTime: Date(),
//     type: "light"
// })
// let newA3 = new Appliance({
//     id:"fn-01",
//     name: "Room Fan",
//     image: "/",
//     pin: 10,
//     lastStatus: "ON",
//     lastStatusTime: Date(),
//     type: "light"
// })
// let newA4 = new Appliance({
//     id:"bl-02",
//     name: "Terrace Light",
//     image: "/",
//     pin: 11,
//     lastStatus: "ON",
//     lastStatusTime: Date(),
//     type: "light"
// })

// newA1.save();
// newA2.save();
// newA3.save();
// newA4.save();

wss.on('connection', (ws) => {

    ws.on('message', (message) => {
        // console.log(message)
    });
    ws.send('{"type":"OTHER", "data":"Hi there, I am a WebSocket server"}');
});


app.post('/login', (req, res) => {
    let time = Date()
    firebaseAuth.signInWithEmailAndPassword(req.body.email, req.body.password)
        .then(() => {
            let token = crypto.MD5('/AzIm/' + req.body.email + '*' + req.body.password + '*' + time.toString() + '/AyEsha/').toString()
            let authToken = new Auth({ token: token, date: time, valid: true })
            authToken.save()
                .then(savedToken => {
                    console.log("New login detected")
                    Auth.find({}, (err, result) => {
                        if (err) {
                            console.log(err)
                            res.json({ authenticated: false, token: null })
                            return
                        }
                    })
                    res.json({ authenticated: true, token: token })
                    return
                })
                .catch((err) => {
                    console.log(err)
                    console.log("Database save failed")
                    res.json({ authenticated: false, token: null })
                    return
                })
        })
        .catch(() => {
            console.log("Sign in failed")
            res.json({ authenticated: false, token: null })
            return
        })
})
app.post('/pingAppliances', (req, res) => {
    Auth.find({ token: req.body.token }, (err, result) => {
        if (err) {
            console.log("Err1")
            console.log(err)
            res.json({ type: "Auth failed" })
            return
        } else if (result.length === 0) {
            console.log("Err2")
            res.json({ type: "Auth failed" })
            return
        } else {
            Appliance.find({}, (error, objects) => {
                if (error) {
                    console.log("Err3")
                    console.log(error)
                    res.json({ type: "error" })
                    return
                } else {
                    let pinsAndIds = []
                    objects.forEach(appliance => {
                        pinsAndIds.push(`"${appliance.id}"`)
                        pinsAndIds.push(`"${appliance.pin}"`)
                    })
                    wss.clients.forEach(client => {
                        client.send((`{"type":"ping","pins":[${pinsAndIds}]}`))
                        client.on('message', message => {
                            message = JSON.parse(message)
                            if (message.type === 'pingResult') {
                                let status = message.data;
                                status.forEach(appliance => {
                                    Appliance.findOne({ id: appliance.id }, (errors, object) => {
                                        if (errors) {
                                            console.log("Err4")
                                            console.log(errors)
                                            res.json({ type: "error" })
                                            return
                                        } else {
                                            object.lastStatus = appliance.status
                                            object.lastStatusTime = Date()
                                            object.save()
                                        }
                                    })
                                })

                            }
                        })
                    })
                }
            })
        }
    }).then(() => {
        res.json({ type: "success" })
        return
    })
})
app.get('/appliance', (req, res) => {
    Appliance.find({}, (err, result) => {
        if (err) {
            res.json({ type: "error", data: [] })
            return
        } else {
            res.json({ type: "success", data: result })
            return
        }
    })
})

app.post('/applianceToggle', (req, res) => {
    Auth.find({ token: req.body.token }, (err, result) => {
        if (err) {
            res.json({ status: "Auth Failed" })
            return
        } else if (result.length > 0) {
            if (result[0].valid) {
                Appliance.findOne({ "id": req.body.payload.appliance.id }, (err, result) => {
                    if (err) {
                        res.json(({ status: "Unknown Error:1" }))
                        return
                    } else {
                        result.lastStatus = req.body.payload.action
                        result.lastStatusTime = Date()
                        result.save().then((object) => {
                            if (object) {
                                wss.clients.forEach(client => {
                                    client.send(`{"type":"toggle", "action":"${req.body.payload.action}", "id":"${req.body.payload.appliance.id}", "pin": "${req.body.payload.appliance.pin}"}`)
                                })
                                res.json({ status: "SUCCESS" })
                                return
                            } else {
                                res.json(({ status: "Unknown Error:2" }))
                                return
                            }
                        })
                    }
                })

            } else {
                res.json({ status: "Auth Failed" })
                return
            }
        } else {
            res.json({ status: "Auth Failed" })
            return
        }
    })
})

app.get('/ping', (req, res) => {
    res.send("pong")
})


server.listen(process.env.PORT || 6969, () => {
    console.log(`Server started on port ${server.address().port}`);
});