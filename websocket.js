module.exports = function (database) {

    const WebSocket = require('ws');
    const port = (process.env.PORT || 3000) + 1;
    const wss = new WebSocket.Server({port});
    const io = require('socket.io-client');

    wss.on('connection', function connection(ws) {

        //Donation alerts websocket connection
        let socket = io("wss://websocket.donationalerts.ru:443");
        socket.emit('add-user', {token: database.get('token'), type: "minor"});
        socket.on('donation', function (msg) {
            msg = JSON.parse(msg);

            let current = +database.get('current');
            let goal = +database.get('goal');
            let royalGoal = +database.get('royalGoal');

            let royal = +msg.amount_main >= royalGoal;

            if (!royal) database.set('current', (current + msg.amount_main) % goal).write();
            ws.send(JSON.stringify({goal: database.get('goal'), current: database.get('current')}));

            if (royal)
                spinRoulette(true, msg.username);
            else if (current + msg.amount_main >= goal)
                spinRoulette(false, msg.username);
        });

        ws.on('message', function incoming(message) {
            if (message === "init")
                ws.send(JSON.stringify({
                    goal: database.get('goal'),
                    current: database.get('current')
                }));
            if (message === "spin") spinRoulette(false, "albisha");
            if (message === "royalSpin") spinRoulette(true, "albisha");
        });

        function spinRoulette(royal, user) {
            let startAngle = JSON.parse(JSON.stringify(database.get('angle')));
            let spinTimeTotal = Math.random() * 50 + 50 * 1000;
            let spinAngleStart = Math.random() * 10 + 20;
            let time = 0;
            while (time < spinTimeTotal) {
                time += 50;
                let spinAngle = spinAngleStart - easeOut(time, 0, spinAngleStart, spinTimeTotal);
                startAngle += (spinAngle * Math.PI / 180);
            }
            let actions = JSON.parse(JSON.stringify(database.get(royal ? "royalActions" : "actions")));
            let arc = Math.PI / (actions.length / 2);
            let degrees = startAngle * 180 / Math.PI + 90;
            let arcd = arc * 180 / Math.PI;
            let index = Math.floor((360 - degrees % 360) / arcd);

            ws.send(JSON.stringify({
                spin: true,
                user: user,
                spinAngle: spinAngleStart,
                spinTime: spinTimeTotal,
                angle: database.get('angle'),
                actions: actions,
                royal: royal
            }));

            database.set('angle', startAngle % 360).write();

            database.get('debtActions').push({
                action: actions[index] || "Придуманное желание",
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
};