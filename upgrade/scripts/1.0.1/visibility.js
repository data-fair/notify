exports.description = 'subscription.visibility is private by default'

exports.exec = async (db, debug) => {
  const res = await db.collection('subscriptions').updateMany({ visibility: { $exists: false } }, { $set: { visibility: 'private' } })
  debug(`updated ${res.modifiedCount} subscriptions`)
}
