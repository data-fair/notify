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
  const identity = {
    ...req.params,
    name: req.body.name,
    organizations: req.body.organizations,
    departments: req.body.departments
  }
  const db = req.app.get('db')
  if (identity.type === 'user') {
    await db.collection('notifications').updateMany({ 'recipient.id': identity.id }, { $set: { 'recipient.name': identity.name } })
    await db.collection('subscriptions').updateMany({ 'recipient.id': identity.id }, { $set: { 'recipient.name': identity.name } })
  }
  await db.collection('subscriptions').updateMany({ 'sender.type': identity.type, 'sender.id': identity.id }, { $set: { 'sender.name': identity.name } })
  await db.collection('topics').updateMany({ 'owner.type': identity.type, 'owner.id': identity.id }, { $set: { 'owner.name': identity.name } })
  await db.collection('pushSubscriptions').updateMany({ 'owner.type': identity.type, 'owner.id': identity.id }, { $set: { 'owner.name': identity.name } })
  await db.collection('webhook-subscriptions').updateMany({ 'sender.type': identity.type, 'sender.id': identity.id }, { $set: { 'sender.name': identity.name } })
  await db.collection('webhook-subscriptions').updateMany({ 'owner.type': identity.type, 'owner.id': identity.id }, { $set: { 'owner.name': identity.name } })
  if (identity.departments) {
    for (const department of req.body.departments.filter(d => !!d.name)) {
      await db.collection('subscriptions').updateMany({ 'sender.type': identity.type, 'sender.id': identity.id, 'sender.department': identity.department }, { $set: { 'sender.name': identity.name, 'sender.departmentName': department.name } })
      await db.collection('topics').updateMany({ 'owner.type': identity.type, 'owner.id': identity.id, 'owner.department': identity.department }, { $set: { 'owner.name': identity.name, 'owner.departmentName': department.name } })
      await db.collection('pushSubscriptions').updateMany({ 'owner.type': identity.type, 'owner.id': identity.id, 'owner.department': identity.department }, { $set: { 'owner.name': identity.name, 'owner.departmentName': department.name } })
      await db.collection('webhook-subscriptions').updateMany({ 'sender.type': identity.type, 'sender.id': identity.id, 'sender.department': identity.department }, { $set: { 'sender.name': identity.name, 'sender.departmentName': department.name } })
      await db.collection('webhook-subscriptions').updateMany({ 'owner.type': identity.type, 'owner.id': identity.id, 'owner.department': identity.department }, { $set: { 'owner.name': identity.name, 'owner.departmentName': department.name } })
    }
  }

  if (identity.type === 'user' && identity.organizations) {
    const privateSubscriptionFilter = {
      'recipient.id': identity.id,
      visibility: { $ne: 'public' },
      'sender.type': 'organization'
    }
    for await (const privateSubscription of db.collection('subscriptions').find(privateSubscriptionFilter)) {
      let userOrg = identity.organizations.find(o => o.id === privateSubscription.sender.id && !o.department)
      if (privateSubscription.sender.department) {
        userOrg = userOrg || identity.organizations.find(o => o.id === privateSubscription.sender.id && o.department === privateSubscription.sender.department)
      }
      if (privateSubscription.sender.role && userOrg.role !== privateSubscription.sender.role && userOrg.role !== 'admin') {
        userOrg = null
      }
      if (!userOrg) {
        console.log('remove private subscription that does not match user orgs anymore', identity, privateSubscription)
        await db.collection('subscriptions').deleteOne({ _id: privateSubscription._id })
      }
    }
  }
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
