const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));

const database = require('./database');
require('./websocket')(database, app);
require('./tray')();
app.listen(PORT, function () {
    console.log(`Приложение развенуто - http://localhost:${PORT}`);
    console.log();
    console.log(`Рулетка - http://localhost:${PORT}/roulette`);
    console.log(`Донаты - http://localhost:${PORT}/status`);
    console.log(`Сообщение - http://localhost:${PORT}/message`);
});

app.get('/roulette', (req, res) => res.sendFile(__dirname + '/public/html/main.html'));
app.get('/status', (req, res) => res.sendFile(__dirname + '/public/html/status.html'));
app.get('/message', (req, res) => res.sendFile(__dirname + '/public/html/message.html'));

app.get('/settings', (req, res) => res.sendFile(__dirname + '/public/html/settings.html'));
app.get('/wishList', (req, res) => res.sendFile(__dirname + '/public/html/wish_list.html'));

app.get('/get', (req, res) => res.send({
    token: database.get('token'),
    goal: database.get('goal'),
    actions: database.get('actions'),
    royalGoal: database.get('royalGoal'),
    royalActions: database.get('royalActions'),
}));

app.post('/save', (req, res) => {
    database.set('token', req.body.token).write();
    database.set('goal', req.body.goal).write();
    database.set('royalGoal', req.body.royalGoal).write();
    database.set('actions', req.body.actions).write();
    database.set('royalActions', req.body.royalActions).write();
    res.send('Сохранено!')
});

app.get('/debts', (req, res) => res.send(database.get('debtActions')));
app.post('/debts', (req, res) => database.get('debtActions').remove(req.body[0]).write());
