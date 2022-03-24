const express = require('express')
const asyncWrap = require('../utils/async-wrap')
const findUtils = require('../utils/find')
const router = express.Router()

// Get the list of webhooks
router.get('', asyncWrap(async (req, res, next) => {
  if (!req.user) return res.status(401).send()
  if (!req.user.adminMode && req.activeAccountRole !== 'admin') {
    return res.status(403).send('Only an admin can create manage webhooks')
  }
  const db = req.app.get('db')
  const sort = { 'notification.date': -1 }
  const [skip, size] = findUtils.pagination(req.query)
  const query = { 'owner.type': req.activeAccount.type, 'owner.id': req.activeAccount.id }
  if (req.query.subscription) query['subscription._id'] = req.query.subscription
  const webhooks = db.collection('webhooks')
  const resultsPromise = webhooks.find(query).limit(size).skip(skip).sort(sort).toArray()
  const countPromise = webhooks.countDocuments(query)
  const [results, count] = await Promise.all([resultsPromise, countPromise])
  res.json({ results, count })
}))

router.post('/:id/_retry', asyncWrap(async (req, res, next) => {
  if (!req.user) return res.status(401).send()
  if (!req.user.adminMode && req.activeAccountRole !== 'admin') {
    return res.status(403).send('Only an admin can create manage webhooks')
  }
  const webhook = (await req.app.get('db').collection('webhooks').findOneAndUpdate(
    { _id: req.params.id, 'owner.type': req.activeAccount.type, 'owner.id': req.activeAccount.id },
    { $set: { status: 'waiting', nbAttempts: 0 }, $unset: { nextAttempt: '' } },
    { returnDocument: 'after' })).value
  if (!webhook) return res.status(404).send()
  res.send(webhook)
}))

router.post('/:id/_cancel', asyncWrap(async (req, res, next) => {
  if (!req.user) return res.status(401).send()
  if (!req.user.adminMode && req.activeAccountRole !== 'admin') {
    return res.status(403).send('Only an admin can create manage webhooks')
  }
  const webhook = (await req.app.get('db').collection('webhooks').findOneAndUpdate(
    { _id: req.params.id, 'owner.type': req.activeAccount.type, 'owner.id': req.activeAccount.id },
    { $set: { status: 'cancelled' }, $unset: { nextAttempt: '' } },
    { returnDocument: 'after' })).value
  if (!webhook) return res.status(404).send()
  res.send(webhook)
}))

module.exports = router
