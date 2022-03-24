// Simple subscribe mechanism to follow channels of messages from the server
// Bodies are simple JSON objects following theses conventions:

/*
Upstream examples:
{type: 'subscribe', channel: 'my_channel'}
{type: 'unsubscribe', channel: 'my_channel'}

Downstream examples:
{type: 'subscribe-confirm', channel: 'my_channel'}
{type: 'unsubscribe-confirm', channel: 'my_channel'}
{type: 'message', channel: 'my_channel', data: {...}}
{type: 'error', data: {...}}
*/
const WebSocket = require('ws')
const { nanoid } = require('nanoid')

let cursor
const subscribers = {}
const clients = {}

let stopped = false
exports.stop = async (wss) => {
  stopped = true
  wss.close()
  if (cursor) cursor.close()
}

async function channel (db) {
  const collection = (await db.listCollections({ name: 'messages' }).toArray())[0]
  if (!collection) await db.createCollection('messages', { capped: true, size: 100000, max: 1000 })
  return db.collection('messages')
}

exports.start = async ({ server, db, session }) => {
  const wss = new WebSocket.Server({ server })

  wss.on('connection', (ws, req) => {
    session.auth(req, null, () => {
      if (!req.user) {
        ws.send(JSON.stringify({ type: 'error', data: 'authentication is required' }))
        return ws.terminate()
      }

      // Associate ws connections to ids for subscriptions
      const clientId = nanoid()
      clients[clientId] = ws

      // Manage subscribe/unsubscribe demands
      ws.on('message', str => {
        if (stopped) return
        let message
        try {
          message = JSON.parse(str)
        } catch (err) {
          return ws.send(JSON.stringify({ type: 'error', data: err.message }))
        }
        if (!message.type || ['subscribe', 'unsubscribe'].indexOf(message.type) === -1) {
          return ws.send(JSON.stringify({ type: 'error', data: 'type should be "subscribe" or "unsubscribe"' }))
        }
        if (!message.channel) {
          return ws.send(JSON.stringify({ type: 'error', data: '"channel" is required' }))
        }
        if (message.type === 'subscribe') {
          const [ownerType, ownerId] = message.channel.split(':')
          if (!req.user.isAdmin) {
            if (ownerType === 'user' && ownerId !== req.user.id) {
              return ws.send(JSON.stringify({ type: 'error', data: 'subscription not allowed' }))
            }
            if (ownerType === 'organization' && !req.user.organizations.find(o => o.id === ownerId)) {
              return ws.send(JSON.stringify({ type: 'error', data: 'subscription not allowed' }))
            }
          }
          subscribers[message.channel] = subscribers[message.channel] || {}
          subscribers[message.channel][clientId] = 1
          return ws.send(JSON.stringify({ type: 'subscribe-confirm', channel: message.channel }))
        }
        if (message.type === 'unsubscribe') {
          subscribers[message.channel] = subscribers[message.channel] || {}
          delete subscribers[message.channel][clientId]
          return ws.send(JSON.stringify({ type: 'unsubscribe-confirm', channel: message.channel }))
        }
      })

      ws.on('close', () => {
        Object.keys(subscribers).forEach(channel => {
          delete subscribers[channel][clientId]
        })
        delete clients[clientId]
      })

      ws.on('error', () => ws.terminate())

      ws.isAlive = true
      ws.on('pong', () => { ws.isAlive = true })
    })
  })

  // standard ping/pong used to detect lost connections
  setInterval(function ping () {
    if (stopped) return
    wss.clients.forEach(ws => {
      if (ws.isAlive === false) return ws.terminate()

      ws.isAlive = false
      ws.ping('', false, () => {})
    })
  }, 30000)

  const mongoChannel = await channel(db)
  await mongoChannel.insertOne({ type: 'init' })
  initCursor(db, mongoChannel)
  return wss
}

// Listen to pubsub channel based on mongodb to support scaling on multiple processes
let startDate = new Date().toISOString()
const initCursor = (db, mongoChannel) => {
  cursor = mongoChannel.find({}, { tailable: true, awaitData: true })
  cursor.forEach(doc => {
    if (stopped) return
    if (doc && doc.type === 'message') {
      if (doc.data.date && doc.data.date < startDate) return
      if (doc.channel && !doc.channels) doc.channels = [doc.channel]
      doc.channels.forEach(channel => {
        const subs = subscribers[channel] || {}
        Object.keys(subs).forEach(sub => {
          if (clients[sub]) clients[sub].send(JSON.stringify({ ...doc, channel }))
        })
      })
    }
  }, async (err) => {
    if (stopped) return
    startDate = new Date().toISOString()
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('WS tailable cursor was interrupted, reinit it', err && err.message)
    initCursor(db, mongoChannel)
  })
}

exports.initPublisher = async (db) => {
  // Write to pubsub channel
  const mongoChannel = await channel(db)
  await mongoChannel.insertOne({ type: 'init' })
  return (channels, data) => mongoChannel.insertOne({ type: 'message', channels, data })
}
