// App
const express = require('express');
const app = express();
const port = 3000;
app.listen(port, () => console.log(`App listening on port ${port}`));
app.get('/', (req, res) => res.sendFile(__dirname + '/public/html/main.html'));
app.get('/settings', (req, res) => res.sendFile(__dirname + '/public/html/settings.html'));
app.get('/wishList', (req, res) => res.sendFile(__dirname + '/public/html/wish_list.html'));

// DateBase
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json');
const db = low(adapter);
db.defaults({
    token: '',

    expensiveWishes: [],
    expensiveGoal: 0,

    goal: 0,
    current: 0,
    wishes: [],
    angle: 0
}).write();
app.use(express.static("public"));

// WebSocket
const WebSocket = require('ws');
const WSPort = port + 1;
const wss = new WebSocket.Server({port: WSPort});
const io = require('socket.io-client');

wss.on('connection', function connection(ws) {


    //Donation alerts websocket connection
    let socket = io("wss://socket.donationalerts.ru:443");
    socket.emit('add-user', {token: db.get('token'), type: "minor"});

    socket.on('donation', function (msg) {
        msg = JSON.parse(msg);
        ws.send(JSON.stringify({spin: true, username: msg.username}));
    });

    ws.on('message', function incoming(message) {
        if (message === "wgc")
            ws.send(JSON.stringify({
                wishes: db.get('wishes'),
                goal: db.get('goal'),
                current: db.get('current'),
                angle: db.get('angle')
            }));
        if (message === "testSpin") {
            let startAngle = JSON.parse(JSON.stringify(db.get('angle')));
            let spinTimeTotal = Math.random() * 50 + 50 * 1000;
            let spinAngleStart = Math.random() * 10 + 20;

            let time = 0;
            while (time < spinTimeTotal) {
                time += 50;
                let spinAngle = spinAngleStart - easeOut(time, 0, spinAngleStart, spinTimeTotal);
                startAngle += (spinAngle * Math.PI / 180);
            }
            let wishes = JSON.parse(JSON.stringify(db.get('wishes')));
            let arc = Math.PI / (wishes.length / 2);
            let degrees = startAngle * 180 / Math.PI + 90;
            let arcd = arc * 180 / Math.PI;
            let index = Math.floor((360 - degrees % 360) / arcd);
            console.log(wishes[index]);

            ws.send(JSON.stringify({
                spin: true,
                user: "random_nick__",
                spinAngle: spinAngleStart,
                spinTime: spinTimeTotal,
                angle: db.get('angle')
            }));
            db.set('angle', startAngle % 360).write();
        }
        if (message === "testSpin2") {
            let startAngle = JSON.parse(JSON.stringify(db.get('angle')));
            let spinTimeTotal = Math.random() * 50 + 50 * 1000;
            let spinAngleStart = Math.random() * 10 + 20;
            let time = 0;
            while (time < spinTimeTotal) {
                time += 50;
                let spinAngle = spinAngleStart - easeOut(time, 0, spinAngleStart, spinTimeTotal);
                startAngle += (spinAngle * Math.PI / 180);
            }
            let wishes = JSON.parse(JSON.stringify(db.get('expensiveWishes')));
            let arc = Math.PI / (wishes.length / 2);
            let degrees = startAngle * 180 / Math.PI + 90;
            let arcd = arc * 180 / Math.PI;
            let index = Math.floor((360 - degrees % 360) / arcd);
            console.log(wishes[index]);

            ws.send(JSON.stringify({
                spin: true,
                user: "random_nick__",
                spinAngle: spinAngleStart,
                spinTime: spinTimeTotal,
                angle: db.get('angle'),
                wishes: wishes,
                gold: true
            }));
            db.set('angle', startAngle % 360).write();
        }
    });
});

function easeOut(t, b, c, d) {
    let ts = (t /= d) * t;
    let tc = ts * t;
    return b + c * (tc + -3 * ts + 3 * t);
}
