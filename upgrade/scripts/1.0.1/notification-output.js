exports.description = 'replace "web" output by "devices"'

exports.exec = async (db, debug) => {
  let nb = 0
  for await (const subscription of db.collection('subscriptions').find({ outputs: 'web' })) {
    const outputs = subscription.outputs.filter(o => o !== 'web').concat(['devices'])
    await db.collection('subscriptions').updateOne({ _id: subscription._id }, { $set: { outputs } })
    nb++
  }
  debug(`updated ${nb} subscriptions`)
}
