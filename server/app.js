const express = require('express')
const bodyParser = require('body-parser')
const config = require('config')
const cookieParser = require('cookie-parser')
const eventToPromise = require('event-to-promise')
const proxy = require('http-proxy-middleware')
const http = require('http')
const session = require('@koumoul/sd-express')({
  directoryUrl: config.directoryUrl,
  privateDirectoryUrl: config.privateDirectoryUrl
})
const status = require('./status')
const ws = require('./ws')
const auth = require('./utils/auth')

const app = express()
app.set('json spaces', 2)
app.set('session', session)
const server = http.createServer(app)

if (process.env.NODE_ENV === 'development') {
  // Create a mono-domain environment with other services in dev
  app.use('/simple-directory', proxy({ target: 'http://localhost:8080', pathRewrite: { '^/simple-directory': '' } }))
}

app.use(cookieParser())
app.use(bodyParser.json())

app.get('/api/v1/status', auth(), status.status)
app.get('/api/v1/ping', status.ping)

app.use('/api/v1/topics', require('./router/topics'))
app.use('/api/v1/subscriptions', auth(), require('./router/subscriptions'))
app.use('/api/v1/notifications', require('./router/notifications'))
app.use('/api/v1/push', auth(), require('./utils/push').router)
app.use('/api/v1/identities', require('./router/identities'))

// Run app and return it in a promise
let wss
exports.start = async () => {
  const nuxt = await require('./nuxt')()
  app.use(nuxt)
  const { db, client } = await require('./utils/db').init()
  await require('../upgrade')(db)
  app.set('db', db)
  app.set('client', client)
  app.set('push', await require('./utils/push').init(db))
  server.listen(config.port)
  await eventToPromise(server, 'listening')
  wss = await ws.start({ server, db, session })
  app.set('publishWS', await ws.initPublisher(db))
  console.log(`HTTP and WebSocket server listening on ${config.port}, available at ${config.publicUrl}`)
}

exports.stop = async () => {
  if (wss) ws.stop(wss)
  server.close()
  await eventToPromise(server, 'close')
  if (app.get('client')) await app.get('client').close()
}
