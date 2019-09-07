// App
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
const port = 3000;
app.listen(port, () => {
    console.log(`Рулетка - http://localhost:${port}`);
    console.log(`Настройки - http://localhost:${port}/settings`);
    console.log(`Задание на выполнения - http://localhost:${port}/wishList`);
    console.log(`---------------------------------------------------------`);
    console.log(`Закрыть - http://localhost:${port}/close`);
});
app.get('/close', (req, res) => {
    res.send("<h1>Рулетка остановлена!</h1>");
    process.exit()
});

app.get('/', (req, res) => res.sendFile(__dirname + '/public/html/main.html'));
app.get('/settings', (req, res) => res.sendFile(__dirname + '/public/html/settings.html'));
app.get('/wishList', (req, res) => res.sendFile(__dirname + '/public/html/wish_list.html'));

app.get('/data', (req, res) => res.send({
    token: db.get('token'),
    goal: db.get('goal'),
    actions: db.get('actions'),
    royalGoal: db.get('royalGoal'),
    royalActions: db.get('royalActions'),
}));

app.get('/debts', (req, res) => res.send(db.get('debtActions')));
app.post('/debts', (req, res) => db.get('debtActions').remove(req.body[0]).write());

app.post('/saveActions', (req, res) => db.set('actions', req.body).write());
app.post('/saveRoyalActions', (req, res) => db.set('royalActions', req.body).write());

app.post('/saveData', (req, res) => {
    db.set('token', req.body.token).write();
    db.set('goal', req.body.goal).write();
    db.set('royalGoal', req.body.royalGoal).write();
});

// DateBase
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json');
const db = low(adapter);
db.defaults({
    token: '',

    royalActions: [],
    royalGoal: 0,

    actions: [],
    goal: 0,

    current: 0,
    angle: 0,
    debtActions: []
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

        let current = +db.get('current');
        let goal = +db.get('goal');
        let royalGoal = +db.get('royalGoal');

        let royal = +msg.amount_main >= royalGoal;

        if (!royal) db.set('current', (current + msg.amount_main) % goal).write();
        ws.send(JSON.stringify({goal: db.get('goal'), current: db.get('current')}));

        if (royal)
            spinRoulette(true, msg.username);
        else if (current + msg.amount_main >= goal)
            spinRoulette(false, msg.username);
    });

    ws.on('message', function incoming(message) {
        if (message === "init")
            ws.send(JSON.stringify({
                goal: db.get('goal'),
                current: db.get('current')
            }));
        if (message === "spin") spinRoulette(false, "albisha");
        if (message === "royalSpin") spinRoulette(true, "albisha");
    });

    function spinRoulette(royal, user) {
        let startAngle = JSON.parse(JSON.stringify(db.get('angle')));
        let spinTimeTotal = Math.random() * 50 + 50 * 1000;
        let spinAngleStart = Math.random() * 10 + 20;
        let time = 0;
        while (time < spinTimeTotal) {
            time += 50;
            let spinAngle = spinAngleStart - easeOut(time, 0, spinAngleStart, spinTimeTotal);
            startAngle += (spinAngle * Math.PI / 180);
        }
        let actions = JSON.parse(JSON.stringify(db.get(royal ? "royalActions" : "actions")));
        let arc = Math.PI / (actions.length / 2);
        let degrees = startAngle * 180 / Math.PI + 90;
        let arcd = arc * 180 / Math.PI;
        let index = Math.floor((360 - degrees % 360) / arcd);

        ws.send(JSON.stringify({
            spin: true,
            user: user,
            spinAngle: spinAngleStart,
            spinTime: spinTimeTotal,
            angle: db.get('angle'),
            actions: actions,
            royal: royal
        }));

        db.set('angle', startAngle % 360).write();

        db.get('debtActions').push({
            action: actions[index],
            author: user || "albisha",
            date: new Date()
        }).write();
    }

    function easeOut(t, b, c, d) {
        let ts = (t /= d) * t;
        let tc = ts * t;
        return b + c * (tc + -3 * ts + 3 * t);
    }
});