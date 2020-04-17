module.exports = function(database) {
  const WebSocket = require('ws')
  const port = (process.env.PORT || 3000) + 1
  const wss = new WebSocket.Server({ port })
  const io = require('socket.io-client')

  wss.on('connection', function(ws) {
    const socket = io('wss://websocket.donationalerts.ru:443')
    socket.emit('add-user', { token: database.get('token'), type: 'minor' })
    socket.on('donation', donation)

    ws.on('message', function incoming(message) {
      try {
        const parsed = JSON.parse(message)
        if (parsed.amount_main) donation(message)
      } catch (e) {
      }

      if (message === 'init') donation()
      if (message === 'spin') spinRoulette(false)
      if (message === 'royalSpin') spinRoulette(true)
    })

    function donation(msg) {
      try {
        msg = JSON.parse(msg)
      } catch (e) {
        msg = { amount_main: 0, username: 'albisha' }
      }

      let current = Number(database.get('current'))
      const goal = Number(database.get('goal'))
      const royalGoal = Number(database.get('royalGoal'))

      const donateAmount = Number(msg.amount_main)
      const donateUser = msg.username

      const royal = donateAmount >= royalGoal
      const sum = donateAmount + current
      const isWin = sum >= goal

      current = sum % goal

      if (!royal) {
        database.set('current', current).write()
        ws.send(JSON.stringify({ status: { goal, current, isWin } }))
      }

      if (royal)
        spinRoulette(true, donateUser)
      else if (isWin)
        spinRoulette(false, donateUser)
    }

    function spinRoulette(royal, user) {
      let startAngle = JSON.parse(JSON.stringify(database.get('angle')))
      let actions = JSON.parse(JSON.stringify(database.get(royal ? 'royalActions' : 'actions')))
      let rotateDuration = JSON.parse(JSON.stringify(database.get('rotateDuration')))
      let pause = JSON.parse(JSON.stringify(database.get('pause')))

      let actionsLength = actions.length
      let index = Math.round(randomInt(0, actionsLength - 1))

      const angle = 360 / actions.length
      let endAngle = (randomInt(5, 10) * 360) - randomInt((angle * index) - (angle / 2), (angle * index) + (angle / 2) - 1)

      ws.send(JSON.stringify({
        roulette: {
          startAngle,
          endAngle,
          rotateDuration,
          pause,
          actionsLength,
          royal
        }
      }))

      database.set('angle', endAngle % 360).write()

      database.get('debtActions').push({
        action: actions[index] || 'Придуманное желание',
        author: user || 'albisha',
        date: new Date()
      }).write()
    }
  })
}

function randomInt(min, max) {
  let rand = min + Math.random() * (max + 1 - min)
  return Math.floor(rand)
}