const express = require('express')
const { nanoid } = require('nanoid')
const config = require('config')
const ajv = require('ajv')()
const schema = require('../../contract/topic')(config.i18n.locales.split(','))
const validate = ajv.compile(schema)
const asyncWrap = require('../utils/async-wrap')
const auth = require('../utils/auth')

const router = express.Router()

// Get the list of topics
router.get('', auth(), asyncWrap(async (req, res, next) => {
  // not sort, project or filter here
  // we need to build a tree with results, simpler to always return everything for now
  let filter
  if (req.query.global === 'true' && !req.user.adminMode) return res.status(403).send()
  if (req.query.global) {
    filter = { 'owner.id': '*' }
  } else {
    filter = { 'owner.type': req.user.accountOwner.type, 'owner.id': { $in: [req.user.accountOwner.id, '*'] } }
  }
  const results = await req.app.get('db').collection('topics')
    .find(filter).limit(10000).toArray()
  res.json({ results, count: results.length })
}))

// Create a topic
router.post('', asyncWrap(async (req, res, next) => {
  const db = req.app.get('db')
  if (req.query.key) {
    if (req.query.key !== config.secretKeys.notifications) return res.status(401).send()
  } else {
    await auth(false)(req, res, () => {})
    if (!req.user) return res.status(401).send()
    if (!req.user.adminMode || !req.body.owner) {
      if (req.user.accountOwnerRole !== 'admin') return res.status(403).send()
      req.body.owner = req.user.accountOwner
    }
  }

  const valid = validate(req.body)
  if (!valid) return res.status(400).send(validate.errors)
  const idFilter = { 'owner.type': req.user.accountOwner.type, 'owner.id': req.user.accountOwner.id, key: req.body.key }
  const existingTopic = await db.collection('topics').findOne(idFilter)
  req.body.updated = { id: req.user.id, name: req.user.name, date: new Date() }
  req.body.created = existingTopic ? existingTopic.created : req.body.updated
  req.body._id = existingTopic ? existingTopic._id : nanoid()
  await db.collection('topics').replaceOne(idFilter, req.body, { upsert: true })
  res.status(200).json(req.body)
}))

router.delete('/:id', asyncWrap(async (req, res, next) => {
  const idFilter = { _id: req.params.id }
  if (req.query.key) {
    if (req.query.key !== config.secretKeys.notifications) return res.status(401).send()
  } else {
    await auth(false)(req, res, () => {})
    if (!req.user) return res.status(401).send()
    if (!req.user.adminMode && req.user.accountOwnerRole !== 'admin') return res.status(403).send()
    if (!req.user.adminMode) {
      idFilter['owner.type'] = req.user.accountOwner.type
      idFilter['owner.id'] = req.user.accountOwner.id
    }
  }
  await req.app.get('db').collection('topics').deleteOne(idFilter)
  res.status(204).send()
}))

module.exports = router
