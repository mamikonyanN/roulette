module.exports = function(database, app) {
  const io = require('socket.io-client')

  const socket = io(
    'wss://socket11.donationalerts.ru:443',
    { reconnection: true, reconnectionDelayMax: 5000, reconnectionDelay: 1000 }
  )
  socket.on('connect', () => socket.emit('add-user', { token: database.get('token'), type: 'alert_widget' }))
  socket.on('donation', donation)

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
      app.emit('statusSend', { goal, current, isWin })
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

    const action = actions[index] || 'Придуманное желание'
    const author = user || 'albisha'

    app.emit('rouletteSend', { startAngle, endAngle, rotateDuration, pause, actionsLength, royal, action, author })

    database.set('angle', endAngle % 360).write()
    database.get('debtActions').push({ action, author, date: new Date() }).write()
  }

  app.get('/getStatus', (req, res) => {
    const goal = Number(database.get('goal'))
    const current = Number(database.get('current'))
    res.send({ goal, current })
  })

  app.get('/rouletteEvent', (req, res) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    })
    app.on('rouletteSend', data => {
      res.write(`event: message\n`)
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    })
  })

  app.get('/statusEvent', (req, res) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    })
    app.on('statusSend', data => {
      res.write(`event: message\n`)
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    })
  })

  app.get('/messageEvent', (req, res) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    })
    app.on('messageSend', data => {
      res.write(`event: message\n`)
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    })
  })

  app.post('/showMessage', (req, res) => {
    app.emit('messageSend', req.body)
    res.sendStatus(200)
  })

  app.post('/testDonate', (req, res) => {
    donation(JSON.stringify(req.body))
    res.sendStatus(200)
  })
}

function randomInt(min, max) {
  let rand = min + Math.random() * (max + 1 - min)
  return Math.floor(rand)
}