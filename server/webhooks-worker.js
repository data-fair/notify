const config = require('config')
const dayjs = require('dayjs')
const axios = require('./utils/axios')
const debug = require('debug')('webhooks-worker')

let loopPromise, stopped

const loop = async (db) => {
  // eslint-disable-next-line no-unmodified-loop-condition
  while (!stopped) {
    const webhook = (await db.collection('webhooks').findOneAndUpdate({
      $or: [
        { status: 'waiting' },
        { status: 'error', nextAttempt: { $lt: new Date() } }
      ]
    }, { $set: { status: 'working' } }, { returnDocument: 'after' })).value
    if (!webhook) {
      debug('no webhook to process, wait for interval', config.worker.loopInterval)
      await new Promise(resolve => setTimeout(resolve, config.worker.loopInterval))
      continue
    }
    debug('work on webhook', webhook)
    const date = new Date()
    const subscription = await db.collection('webhook-subscriptions')
      .findOne({ _id: webhook.subscription._id, 'owner.type': webhook.owner.type, 'owner.id': webhook.owner.id })
    if (!subscription) {
      debug('missing subscription for webhook, store as error')
      await db.collection('webhooks').updateOne({ _id: webhook._id }, {
        $set: {
          status: 'error',
          lastAttempt: { date, error: 'missing subscription' }
        },
        $unset: { nextAttempt: '' }
      })
      continue
    }
    debug('found matching subscription', subscription)
    try {
      const headers = {}
      if (subscription.header && subscription.header.key && subscription.header.value) {
        headers[subscription.header.key] = subscription.header.value
      }
      debug('send webhook', subscription.url, webhook.notification)
      const res = await axios.post(subscription.url, webhook.notification, { headers })
      await db.collection('webhooks').updateOne({ _id: webhook._id }, {
        $set: {
          status: 'ok',
          lastAttempt: { date, status: res.status }
        },
        $unset: { nextAttempt: '' },
        $inc: { nbAttempts: 1 }
      })
    } catch (err) {
      debug('webhook failed', err)
      const patch = {
        $set: {
          status: 'error',
          lastAttempt: { date, status: err.status }
        },
        $inc: { nbAttempts: 1 }
      }
      if (webhook.nbAttempts >= 9) {
        debug('webhook failed 10 times, no more attemps')
        patch.$unset = { nextAttempt: '' }
      } else {
        patch.$set.nextAttempt = dayjs().add(Math.ceil(Math.pow(webhook.nbAttempts + 1, 2.5)), 'minute').toDate()
        debug('webhook failed, progressively backoff', patch.$set.nextAttempt)
      }
      await db.collection('webhooks').updateOne({ _id: webhook._id }, patch)
    }
  }
}

exports.start = (db) => {
  loopPromise = loop(db)
}

exports.stop = async () => {
  stopped = true
  try {
    await loopPromise
  } catch (err) {
    console.error('failure when waiting for loop promise finish')
  }
}
