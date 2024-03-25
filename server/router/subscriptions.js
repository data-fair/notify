const config = require('config')
const express = require('express')
const { nanoid } = require('nanoid')
const ajv = require('../utils/ajv')
const schema = require('../../contract/subscription')(config.i18n.locales.split(','))
const validate = ajv.compile(schema)
const asyncWrap = require('../utils/async-wrap')
const findUtils = require('../utils/find')

const router = express.Router()

// Get the list of subscriptions
router.get('', asyncWrap(async (req, res, next) => {
  const sort = findUtils.sort(req.query.sort)
  const [skip, size] = findUtils.pagination(req.query)
  const query = {}
  const recipient = req.query.recipient || req.user.id
  if (recipient !== req.user.id && !req.user.adminMode) {
    return res.status(403).send('You can only filter on recipient with your own id')
  }
  query['recipient.id'] = recipient

  // noSender/senderType/senderId are kept for compatibility but shoud be replace by simply sender

  if (req.query.noSender || req.query.sender === 'none') {
    query.sender = { $exists: false }
  } else if (req.query.senderType && req.query.senderId) {
    query['sender.type'] = req.query.senderType
    query['sender.id'] = req.query.senderId
  } else if (req.query.sender) {
    const senderParts = req.query.sender.split(':')
    query['sender.type'] = senderParts[0]
    query['sender.id'] = senderParts[1]
    if (senderParts[2]) query['sender.department'] = senderParts[2]
    if (senderParts[3]) query['sender.role'] = senderParts[3]
  }
  if (req.query.topic) {
    query['topic.key'] = req.query.topic
  }

  const subscriptions = req.app.get('db').collection('subscriptions')
  const [results, count] = await Promise.all([
    size > 0 ? subscriptions.find(query).limit(size).skip(skip).sort(sort).toArray() : Promise.resolve([]),
    subscriptions.countDocuments(query)
  ])
  res.json({ results, count })
}))

const canSubscribePrivate = (sender, user) => {
  // super admin can do whatever he wants
  if (user.adminMode) return true
  if (!sender) return false

  // user sends to himself ?
  if (sender.type === 'user') return sender.id === user.id

  if (sender.type === 'organization') {
    let userOrg = user.organizations.find(o => o.id === sender.id && !o.department)
    if (sender.department) {
      userOrg = user.organizations.find(o => o.id === sender.id && o.department === sender.department) || userOrg
    }
    if (!userOrg) return false
    if (sender.role && sender.role !== userOrg.role && userOrg.role !== 'admin') return false
    return true
  }
}

// Create a subscription
router.post('', asyncWrap(async (req, res, next) => {
  const db = req.app.get('db')

  req.body.outputs = req.body.outputs || []

  // maintain compatibility with deprecated "web" output
  if (req.body.outputs.includes('web')) {
    req.body.outputs = req.body.outputs.filter(o => o !== 'web').concat(['devices'])
  }

  const user = req.user
  req.body.recipient = req.body.recipient || { id: user.id, name: user.name }
  if (req.body.recipient.id !== req.user.id && !user.adminMode) {
    return res.status(403).send('Impossible de créer un abonnement pour un autre utilisateur')
  }

  const valid = validate(req.body)
  if (!valid) return res.status(400).send(validate.errors)

  req.body.title = req.body.title || `${req.body.topic.title} (${req.body.recipient.name})`
  const existingSubscription = req.body._id && await db.collection('subscriptions').findOne({ _id: req.body._id })
  req.body._id = req.body._id || nanoid()
  req.body.updated = { id: req.user.id, name: req.user.name, date: new Date() }
  req.body.created = existingSubscription ? existingSubscription.created : req.body.updated

  const sender = req.body.sender

  req.body.visibility = req.body.visibility || 'private'
  if (!canSubscribePrivate(sender, user)) {
    // other cases are accepted, but the subscription will only receive notifications
    // with public visibility
    req.body.visibility = 'public'
  }

  await db.collection('subscriptions').replaceOne({ _id: req.body._id }, req.body, { upsert: true })
  res.status(200).json(req.body)
}))

router.get('/:id', asyncWrap(async (req, res, next) => {
  const subscription = await req.app.get('db').collection('subscriptions').findOne({ _id: req.params.id })
  if (!subscription) return res.status(404).send()
  // both the sender and the recipient can create/modify a subscription
  if (!req.user.adminMode && subscription.recipient.id !== req.user.id) {
    return res.status(403).send('Impossible de lire un abonnement pour un autre utilisateur')
  }
  res.send(subscription)
}))

router.delete('/:id', asyncWrap(async (req, res, next) => {
  const subscription = await req.app.get('db').collection('subscriptions').findOne({ _id: req.params.id })
  if (!subscription) return res.status(204).send()
  // both the sender and the recipient can create/modify a subscription
  if (!req.user.adminMode && subscription.recipient.id !== req.user.id) {
    return res.status(403).send('Impossible de supprimer un abonnement pour un autre utilisateur')
  }

  await req.app.get('db').collection('subscriptions').deleteOne({ _id: req.params.id })
  res.status(204).send()
}))

module.exports = router
