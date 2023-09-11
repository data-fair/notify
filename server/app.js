const EventEmitter = require('events')
const express = require('express')
const bodyParser = require('body-parser')
const config = require('config')
const cookieParser = require('cookie-parser')
const eventToPromise = require('event-to-promise')
const http = require('http')
const { createHttpTerminator } = require('http-terminator')
const cors = require('cors')
const session = require('@data-fair/sd-express')({
  directoryUrl: config.directoryUrl,
  privateDirectoryUrl: config.privateDirectoryUrl
})
const status = require('./status')
const ws = require('./ws')
const webhooksWorker = require('./webhooks-worker')
const auth = require('./utils/auth')
const prometheus = require('./utils/prometheus')

// a global event emitter for testing
global.events = new EventEmitter()

const app = express()
app.set('json spaces', 2)
app.set('session', session)
const server = http.createServer(app)
const httpTerminator = createHttpTerminator({ server })

// cf https://connectreport.com/blog/tuning-http-keep-alive-in-node-js/
// timeout is often 60s on the reverse proxy, better to a have a longer one here
// so that interruption is managed downstream instead of here
server.keepAliveTimeout = (60 * 1000) + 1000
server.headersTimeout = (60 * 1000) + 2000

if (process.env.NODE_ENV === 'development') {
  const proxy = require('http-proxy-middleware')
  // Create a mono-domain environment with other services in dev
  app.use('/simple-directory', proxy.createProxyMiddleware({ target: 'http://localhost:8080', pathRewrite: { '^/simple-directory': '' } }))
}

app.use(cookieParser())
app.use(bodyParser.json())

app.use(require('./utils/i18n').middleware)

app.get('/api/v1/status', auth(), status.status)
app.get('/api/v1/ping', status.ping)

app.use('/api/v1/topics', require('./router/topics'))
app.use('/api/v1/subscriptions', auth(), require('./router/subscriptions'))
app.use('/api/v1/webhook-subscriptions', auth(), require('./router/webhook-subscriptions'))
app.use('/api/v1/webhooks', auth(), require('./router/webhooks'))
app.use('/api/v1/notifications', require('./router/notifications'))
app.use('/api/v1/push', auth(), require('./utils/push').router)
app.use('/api/v1/identities', require('./router/identities'))
if (process.env.NODE_ENV === 'development') {
  app.use('/api/v1/test-webhooks', require('./router/test-webhooks'))
}
app.use('/api', (req, res) => res.status(404).send('Unknown API endpoint'))

let info = { version: process.env.NODE_ENV }
try { info = require('../BUILD.json') } catch (err) {}
app.get('/api/v1/info', auth(true), (req, res) => {
  res.send(info)
})
app.get('/api/v1/admin/info', auth(true), (req, res) => {
  if (!req.user.adminMode) return res.status(403).send()
  res.send({ ...info, config })
})

// Error management
app.use((err, req, res, next) => {
  const status = err.statusCode || err.status || 500
  if (status === 500) {
    console.error('(http) error in express route', err)
    prometheus.internalError.inc({ errorCode: 'http' })
  }
  res.set('Cache-Control', 'no-cache')
  res.set('Expires', '-1')
  // settings content-type as plain text instead of html to prevent XSS attack
  res.type('text/plain')
  res.status(status).send(err.message)
})

// Run app and return it in a promise
let wss
exports.start = async () => {
  const nuxt = await require('./nuxt')()
  app.use(cors(), nuxt.render)
  const { db, client } = await require('./utils/db').init()
  await require('../upgrade')(db)
  app.set('db', db)
  app.set('client', client)
  app.set('push', await require('./utils/push').init(db))
  if (config.prometheus.active) await prometheus.start(db)
  server.listen(config.port)
  await eventToPromise(server, 'listening')
  wss = await ws.start({ server, db, session })
  webhooksWorker.start(db)
  app.set('publishWS', await ws.initPublisher(db))

  console.log(`HTTP and WebSocket server listening on ${config.port}, available at ${config.publicUrl}`)
}

exports.stop = async () => {
  await webhooksWorker.stop()
  if (wss) ws.stop(wss)
  await httpTerminator.terminate()
  if (config.mode !== 'task' && config.prometheus.active) {
    await prometheus.stop()
  }
  if (app.get('client')) await app.get('client').close()
}
