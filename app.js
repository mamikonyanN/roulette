const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));

const database = require('./database');
require('./websocket')(database);
require('./tray')();
app.listen(PORT, function () {
    console.log(`Приложение развенуто - http://localhost:${PORT}`);
});

app.get('/', (req, res) => res.sendFile(__dirname + '/public/html/main.html'));
app.get('/settings', (req, res) => res.sendFile(__dirname + '/public/html/settings.html'));
app.get('/wishList', (req, res) => res.sendFile(__dirname + '/public/html/wish_list.html'));

/*app.get('/get', (req, res) => res.send({
    token: db.get('token'),
    goal: db.get('goal'),
    actions: db.get('actions'),
    royalGoal: db.get('royalGoal'),
    royalActions: db.get('royalActions'),
}));

app.post('/save', (req, res) => {
    db.set('token', req.body.token).write();
    db.set('goal', req.body.goal).write();
    db.set('royalGoal', req.body.royalGoal).write();
    db.set('actions', req.body.actions).write();
    db.set('royalActions', req.body.royalActions).write();
    res.send('Сохранено!')
});

app.get('/debts', (req, res) => res.send(db.get('debtActions')));
app.post('/debts', (req, res) => db.get('debtActions').remove(req.body[0]).write());*/
