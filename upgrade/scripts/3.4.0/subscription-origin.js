const config = require('config')

exports.description = 'fill subscription.origin'

exports.exec = async (db, debug) => {
  const defaultOrigin = new URL(config.publicUrl).origin
  for await (const subscription of db.collection('subscriptions').find({ origin: { $exists: false } })) {
    const origin = subscription.urlTemplate ? new URL(subscription.urlTemplate).origin : defaultOrigin
    await db.collection('subscriptions').updateOne({ _id: subscription._id }, { $set: { origin } })
  }
}
