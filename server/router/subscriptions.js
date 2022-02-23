const config = require('config')
const express = require('express')
const shortid = require('shortid')
const ajv = require('ajv')()
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
  if (!req.query.recipient && !(req.query.senderType && req.query.senderId)) {
    return res.status(400).send('You must filter either with recipient or senderType/senderId params')
  }
  if (req.query.recipient) {
    if (req.query.recipient !== req.user.id) {
      return res.status(403).send('You can only filter on recipient with your own id')
    }
    query['recipient.id'] = req.query.recipient
  }
  if (req.query.senderType && req.query.senderId) {
    if (!req.query.recipient && (req.query.sendType !== req.activeAccount.type || req.query.sendId !== req.activeAccount.id || req.activeAccountRole !== 'admin')) {
      return res.status(403).send('You can only filter on sender if your admin of it')
    }
    query['sender.type'] = req.query.senderType
    query['sender.id'] = req.query.senderId
  }
  if (req.query.noSender) {
    query.sender = { $exists: false }
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

// Create a subscription
router.post('', asyncWrap(async (req, res, next) => {
  const db = req.app.get('db')
  // maintain compatibility with deprecated "web" output
  if (req.body.outputs && req.body.outputs.includes('web')) {
    req.body.outputs = req.body.outputs.filter(o => o !== 'web').concat(['devices'])
  }

  const valid = validate(req.body)
  if (!valid) return res.status(400).send(validate.errors)
  req.body.title = req.body.title || `${req.body.topic.title} (${req.body.recipient.name})`
  const existingSubscription = req.body._id && await db.collection('subscriptions').findOne({ _id: req.body._id })
  req.body._id = req.body._id || shortid.generate()
  req.body.updated = { id: req.user.id, name: req.user.name, date: new Date() }
  req.body.created = existingSubscription ? existingSubscription.created : req.body.updated

  const sender = req.body.sender
  const recipient = req.body.recipient
  const user = req.user
  if (recipient.id !== req.user.id && !user.adminMode) {
    return res.status(403).send('Impossible de créer un abonnement pour un autre utilisateur')
  }

  req.body.visibility = req.body.visibility || 'private'
  if (user.adminMode) {
    // super admin can do whatever he wants
  } else if (sender && sender.type === 'user' && sender.id === req.user.id) {
    // user sends to himself, ok
  } else if (sender && sender.type === 'organization' && !!req.user.organizations.find(o => o.id === req.body.sender.id)) {
    // user subscribes to topic from orga where he is member, ok
  } else {
    // other cases are accepted, but the subscription will only receive notifications
    // with public visibility
    req.body.visibility = 'public'
  }

  await db.collection('subscriptions').replaceOne({ _id: req.body._id }, req.body, { upsert: true })
  res.status(200).json(req.body)
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
