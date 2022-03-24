const { nanoid } = require('nanoid')

exports.createWebhook = async (req, notification, webhookSubscription) => {
  const webhook = {
    _id: nanoid(),
    sender: webhookSubscription.sender,
    owner: webhookSubscription.owner,
    subscription: {
      _id: webhookSubscription._id,
      title: webhookSubscription.title
    },
    notification: {
      title: notification.title,
      body: notification.body,
      topic: notification.topic,
      url: notification.url,
      date: notification.date,
      extra: notification.extra
    },
    status: 'waiting',
    nbAttempts: 0
  }
  await req.app.get('db').collection('webhooks').insertOne(webhook)
}
