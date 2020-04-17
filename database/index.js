const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json');
const database = low(adapter);

database.defaults({
    token: '',

    royalActions: [],
    royalGoal: 0,

    rotateDuration: 5000,
    pause: 2000,

    actions: [],
    goal: 0,

    current: 0,
    angle: 0,
    debtActions: []
}).write();

module.exports = database;