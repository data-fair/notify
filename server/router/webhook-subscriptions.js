const express = require('express')
const { nanoid } = require('nanoid')
const ajv = require('ajv')()
const schema = require('../../contract/webhook-subscription')
const validate = ajv.compile(schema)
const asyncWrap = require('../utils/async-wrap')
const findUtils = require('../utils/find')

const router = express.Router()

// Get the list of subscriptions
router.get('', asyncWrap(async (req, res, next) => {
  const sort = findUtils.sort(req.query.sort)
  const [skip, size] = findUtils.pagination(req.query)
  const query = {}
  if (!req.query.owner) {
    return res.status(400).send('You must filter by owner')
  }
  const [ownerType, ownerId] = req.query.owner.split(':')
  if ((ownerType !== req.activeAccount.type || ownerId !== req.activeAccount.id) && !req.user.adminMode) {
    return res.status(403).send('You can only filter on owner with your current account')
  }
  query['owner.type'] = ownerType
  query['owner.id'] = ownerId

  if (req.query.noSender) {
    query.sender = { $exists: false }
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
  if (!req.user.adminMode && req.activeAccountRole !== 'admin') {
    return res.status(403).send('Only an admin can create manage webhooks')
  }

  const valid = validate(req.body)
  if (!valid) return res.status(400).send(validate.errors)

  const db = req.app.get('db')
  const existingWebhookSubscription = req.body._id && await db.collection('webhook-subscriptions').findOne({ _id: req.body._id })
  req.body._id = req.body._id || nanoid()
  req.body.updated = { id: req.user.id, name: req.user.name, date: new Date() }
  req.body.created = existingWebhookSubscription ? existingWebhookSubscription.created : req.body.updated

  const sender = req.body.sender
  const owner = req.activeAccount

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
  if (!req.user.adminMode && req.activeAccountRole !== 'admin') return res.status(403).send()
  const filter = { _id: req.params.id, 'owner.type': req.activeAccount.type, 'owner.id': req.activeAccount.id }
  const subscription = await req.app.get('db').collection('webhook-subscriptions')
    .findOne(filter)
  if (!subscription) return res.status(404).send()
  await req.app.get('db').collection('webhook-subscriptions').deleteOne(filter)
  res.status(204).send()
}))

module.exports = router
