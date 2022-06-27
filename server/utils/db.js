// TODO add ensureIndex instructions to init logic.

const config = require('config')
const { MongoClient } = require('mongodb')

exports.ensureIndex = async (db, collection, key, options = {}) => {
  try {
    await db.collection(collection).createIndex(key, options)
  } catch (err) {
    if (err.code === 85) return console.warn(err.message)
    if (err.code !== 86 || !options.name) throw err

    // if the error is a conflict on keys or params of the index we automatically
    // delete then recreate the index
    console.log(`Drop then recreate index ${collection}/${options.name}`)
    try {
      await db.collection(collection).dropIndex(options.name)
    } catch (dropErr) {
      console.error('Failure to remove index', err, dropErr)
    }
    await db.collection(collection).createIndex(key, options)
  }
}

exports.connect = async () => {
  const client = await MongoClient.connect(config.mongoUrl)
  const db = client.db()
  return { db, client }
}

exports.init = async () => {
  console.log('Connecting to mongodb ' + config.mongoUrl)
  const { db, client } = await exports.connect()
  await exports.ensureIndex(db, 'topics', { 'owner.type': 1, 'owner.id': 1, key: 1 }, { name: 'main-keys', unique: true })
  await exports.ensureIndex(db, 'subscriptions', { 'sender.type': 1, 'sender.id': 1, 'sender.department': 1, 'sender.role': 1, 'recipient.id': 1, 'topic.key': 1 }, { name: 'main-keys', unique: true })
  await exports.ensureIndex(db, 'notifications', { 'recipient.id': 1, date: -1 }, { name: 'main-keys' })
  await exports.ensureIndex(db, 'pointers', { 'recipient.id': 1 }, { name: 'main-keys' })
  await exports.ensureIndex(db, 'pushSubscriptions', { 'owner.type': 1, 'owner.id': 1 }, { name: 'main-keys', unique: true })
  await exports.ensureIndex(db, 'webhook-subscriptions', { 'sender.type': 1, 'sender.id': 1, 'owner.type': 1, 'owner.id': 1, 'topic.key': 1 }, { name: 'main-keys' })
  await exports.ensureIndex(db, 'webhooks', { 'owner.type': 1, 'owner.id': 1, 'subscription._id': 1, 'notification.date': 1 }, { name: 'main-keys' })
  await exports.ensureIndex(db, 'webhooks', { status: 1, nextAttempt: 1 }, { name: 'loop-keys' })
  return { db, client }
}
