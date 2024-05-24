const express = require('express')
const { nanoid } = require('nanoid')
const ajv = require('../utils/ajv')
const schema = require('../../contract/webhook-subscription')
const validate = ajv.compile(schema)
const asyncWrap = require('../utils/async-wrap')
const findUtils = require('../utils/find')
const { createWebhook } = require('../utils/webhooks')

const router = express.Router()

// Get the list of subscriptions
router.get('', asyncWrap(async (req, res, next) => {
  if (!req.user) return res.status(401).send()
  if (!req.user.adminMode && req.user.accountOwnerRole !== 'admin') {
    return res.status(403).send('Only an admin can manage webhooks')
  }
  const sort = findUtils.sort(req.query.sort)
  const [skip, size] = findUtils.pagination(req.query)
  const query = {}
  query['owner.type'] = req.user.accountOwner.type
  query['owner.id'] = req.user.accountOwner.id

  if (req.query.sender === 'none') {
    query.sender = { $exists: false }
  } else if (req.query.sender) {
    query['sender.type'] = req.query.sender.split(':')[0]
    query['sender.id'] = req.query.sender.split(':')[1]
  }
  if (req.query.topic) {
    query['topic.key'] = req.query.topic
  }

  const webhookSubscriptions = req.app.get('db').collection('webhook-subscriptions')
  const [results, count] = await Promise.all([
    size > 0 ? webhookSubscriptions.find(query).limit(size).skip(skip).sort(sort).toArray() : Promise.resolve([]),
    webhookSubscriptions.countDocuments(query)
  ])
  res.json({ results, count })
}))

// Create a subscription
router.post('', asyncWrap(async (req, res, next) => {
  if (!req.user) return res.status(401).send()
  if (!req.user.adminMode && req.user.accountOwnerRole !== 'admin') {
    return res.status(403).send('Only an admin can manage webhooks')
  }

  const owner = req.body.owner = req.user.accountOwner

  const valid = validate(req.body)
  if (!valid) return res.status(400).send(validate.errors)

  const db = req.app.get('db')
  const existingWebhookSubscription = req.body._id && await db.collection('webhook-subscriptions').findOne({ _id: req.body._id })
  req.body._id = req.body._id || nanoid()
  req.body.updated = { id: req.user.id, name: req.user.name, date: new Date() }
  req.body.created = existingWebhookSubscription ? existingWebhookSubscription.created : req.body.updated

  const sender = req.body.sender

  req.body.visibility = req.body.visibility || 'private'
  if (req.user.adminMode) {
    // super admin can do whatever he wants
  } else if (sender && sender.type === owner.type && sender.id === owner.id) {
    // account sends to himself, ok
  } else {
    // other cases are accepted, but the subscription will only receive notifications
    // with public visibility
    req.body.visibility = 'public'
  }

  await db.collection('webhook-subscriptions').replaceOne({ _id: req.body._id }, req.body, { upsert: true })
  res.status(200).json(req.body)
}))

router.delete('/:id', asyncWrap(async (req, res, next) => {
  if (!req.user) return res.status(401).send()
  if (!req.user.adminMode && req.user.accountOwnerRole !== 'admin') return res.status(403).send()
  const filter = { _id: req.params.id, 'owner.type': req.user.accountOwner.type, 'owner.id': req.user.accountOwner.id }
  const subscription = await req.app.get('db').collection('webhook-subscriptions')
    .findOne(filter)
  if (!subscription) return res.status(404).send()
  await req.app.get('db').collection('webhook-subscriptions').deleteOne(filter)
  res.status(204).send()
}))

router.post('/:id/_test', asyncWrap(async (req, res, next) => {
  if (!req.user) return res.status(401).send()
  if (!req.user.adminMode && req.user.accountOwnerRole !== 'admin') return res.status(403).send()
  const filter = { _id: req.params.id, 'owner.type': req.user.accountOwner.type, 'owner.id': req.user.accountOwner.id }
  const subscription = await req.app.get('db').collection('webhook-subscriptions')
    .findOne(filter)
  if (!subscription) return res.status(404).send()
  await createWebhook(req, {
    title: 'Test webhook',
    topic: { key: 'test', title: 'Test' },
    date: new Date()
  }, subscription)
  res.status(204).send()
}))

module.exports = router
