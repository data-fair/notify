// Define a few routes to be used to synchronize data with the users/organizations directory
// Useful both for functionalities and help respect GDPR rules
const express = require('express')
const config = require('config')
const asyncWrap = require('../utils/async-wrap')
const router = module.exports = express.Router()

router.use((req, res, next) => {
  if (!config.secretKeys.identities || config.secretKeys.identities !== req.query.key) {
    return res.status(403).send('Bad secret in "key" parameter')
  }
  next()
})

// notify a name change or initialization
router.post('/:type/:id', asyncWrap(async (req, res) => {
  const identity = { ...req.params, name: req.body.name }
  const db = req.app.get('db')
  if (identity.type === 'user') {
    db.collection('notifications').updateMany({ 'recipient.id': identity.id }, { $set: { 'recipient.name': identity.name } })
    db.collection('subscriptions').updateMany({ 'recipient.id': identity.id }, { $set: { 'recipient.name': identity.name } })
  }
  await db.collection('topics').updateMany({ 'owner.type': identity.type, 'owner.id': identity.id }, { $set: { 'owner.name': identity.name } })
  await db.collection('pushSubscriptions').updateMany({ 'owner.type': identity.type, 'owner.id': identity.id }, { $set: { 'owner.name': identity.name } })
  res.send()
}))

// Remove resources owned, permissions and anonymize created and updated
router.delete('/:type/:id', asyncWrap(async (req, res) => {
  const identity = { ...req.params, name: req.body.name }
  const db = req.app.get('db')
  if (identity.type === 'user') {
    db.collection('notifications').deleteMany({ 'recipient.id': identity.id })
    db.collection('subscriptions').deleteMany({ 'recipient.id': identity.id })
  }
  await db.collection('topics').deleteMany({ 'owner.type': identity.type, 'owner.id': identity.id })
  await db.collection('pushSubscriptions').deleteMany({ 'owner.type': identity.type, 'owner.id': identity.id })
  res.send()
}))

// Ask for a report of every piece of data in the service related to an identity
router.get('/:type/:id/report', asyncWrap(async (req, res) => {
  // TODO
  res.send()
}))
