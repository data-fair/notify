const express = require('express')
const { nanoid } = require('nanoid')
const config = require('config')
const ajv = require('ajv')()
const schema = require('../../contract/notification')(config.i18n.locales.split(','))
const validate = ajv.compile(schema)
const axios = require('../utils/axios')
const asyncWrap = require('../utils/async-wrap')
const findUtils = require('../utils/find')
const auth = require('../utils/auth')
const { createWebhook } = require('../utils/webhooks')
const prometheus = require('../utils/prometheus')
const urlTemplate = require('url-template')
const debug = require('debug')('notifications')
const router = express.Router()

const DIRECTORY_URL = config.privateDirectoryUrl || config.directoryUrl

// Get the list of notifications
router.get('', auth(), asyncWrap(async (req, res, next) => {
  const db = req.app.get('db')
  const sort = { date: -1 }
  const [skip, size] = findUtils.pagination(req.query)
  const query = { 'recipient.id': req.user.id }
  const notifications = db.collection('notifications')
  let pointer, resultsPromise
  if (size > 0) {
    pointer = (await db.collection('pointers')
      .findOneAndReplace({ 'recipient.id': req.user.id }, { recipient: { id: req.user.id, name: req.user.name }, date: new Date().toISOString() }, { returnOriginal: true, upsert: true })).value
    resultsPromise = notifications.find(query).limit(size).skip(skip).sort(sort).toArray()
  } else {
    pointer = await db.collection('pointers').findOne({ 'recipient.id': req.user.id })
    resultsPromise = new Promise(resolve => resolve([]))
  }
  const countNewPromise = pointer ? notifications.countDocuments({ ...query, date: { $gt: pointer.date } }) : await notifications.countDocuments(query)

  const response = {}
  if (req.query.count !== 'false') response.count = await notifications.countDocuments(query)
  response.countNew = await countNewPromise
  response.results = await resultsPromise
  response.results.forEach(notif => {
    if (!pointer || notif.date > pointer.date) notif.new = true
  })
  res.json(response)
}))

const localizeProp = (prop, locale) => {
  if (prop && typeof prop === 'object') return prop[locale || config.i18n.defaultLocale] || prop[config.i18n.defaultLocale]
  return prop
}
const localize = (notif) => {
  return { ...notif, title: localizeProp(notif.title, notif.locale), body: localizeProp(notif.body, notif.locale), htmlBody: localizeProp(notif.htmlBody, notif.locale) }
}

const prepareNotifSubscription = (originalNotification, subscription) => {
  const notification = {
    icon: subscription.icon || config.theme.notificationIcon || config.theme.logo || (config.publicUrl + '/logo-192x192.png'),
    locale: subscription.locale,
    ...originalNotification, // this is after setting icon/locale, so it takes precedence
    _id: nanoid(),
    recipient: subscription.recipient
  }
  if (subscription.outputs && (!notification.outputs || !notification.outputs.length)) {
    notification.outputs = subscription.outputs
  }
  if (subscription.urlTemplate) {
    notification.url = urlTemplate.parse(subscription.urlTemplate).expand(notification.urlParams || {})
  }
  if (!notification.topic.title && subscription.topic.title) {
    notification.topic.title = subscription.topic.title
  }
  // maintain compatibility with deprecated "web" output
  if (notification.outputs && notification.outputs.includes('web')) {
    notification.outputs = notification.outputs.filter(o => o !== 'web').concat(['devices'])
  }
  return notification
}

const sendNotification = async (req, notification) => {
  if (!notification.locale) notification.locale = config.i18n.defaultLocale
  if (!notification.title) notification.title = notification.topic.title || notification.topic.key
  notification = localize(notification)
  global.events.emit('saveNotification', notification)
  await req.app.get('db').collection('notifications').insertOne(notification)
  debug('Send WS notif', notification.recipient, notification)
  req.app.get('publishWS')([`user:${notification.recipient.id}:notifications`], notification)
  if (notification.outputs && notification.outputs.includes('devices')) {
    debug('Send notif to devices')
    req.app.get('push')(notification).catch(err => {
      console.error('(notif-push) failed to send push notification', err)
      prometheus.internalError.inc({ errorCode: 'notif-push' })
    })
  }
  if (notification.outputs && notification.outputs.includes('email')) {
    global.events.emit('sentNotification', { output: 'email', notification })
    debug('Send notif to email address')
    let text = notification.body || ''
    let simpleHtml = `<p>${notification.body || ''}</p>`
    if (notification.url) {
      text += '\n\n' + notification.url
      simpleHtml += `<p>${req.__({ phrase: 'seeAt', locale: notification.locale })} <a href="${notification.url}">${new URL(notification.url).host}</a></p>`
    }
    const mail = {
      to: [{ type: 'user', ...notification.recipient }],
      subject: notification.title,
      text,
      html: notification.htmlBody || simpleHtml
    }
    debug('Send mail notif', notification.recipient, mail, notification)
    prometheus.sentNotifications.inc({ output: 'mail' })
    axios.post(DIRECTORY_URL + '/api/mails', mail, { params: { key: config.secretKeys.sendMails } }).catch(err => {
      console.error('(notif-mail) failed to send mail', err)
      prometheus.internalError.inc({ errorCode: 'notif-mail' })
    })
  }
}

// push a notification
router.post('', asyncWrap(async (req, res, next) => {
  const db = req.app.get('db')
  const notification = req.body

  if (req.query.key) {
    if (req.query.key !== config.secretKeys.notifications) return res.status(401).send()
  } else {
    await auth(false)(req, res, () => {})
    if (!req.user) return res.status(401).send()
    notification.sender = req.activeAccount
    notification.recipient = notification.recipient || { id: req.user.id, name: req.user.name }
    if (!req.user.adminMode && (!notification.recipient || notification.recipient.id !== req.user.id)) {
      return res.status(403).send()
    }
  }
  prometheus.receivedNotifications.inc()

  notification.visibility = notification.visibility ?? 'private'
  notification.date = new Date().toISOString()
  const valid = validate(notification)
  if (!valid) return res.status(400).send(validate.errors)

  // prepare the filter to find the topics matching this subscription
  const topicParts = notification.topic.key.split(':')
  const topicKeys = topicParts.map((part, i) => topicParts.slice(0, i + 1).join(':'))
  const subscriptionsFilter = { 'topic.key': { $in: topicKeys } }
  if (notification.visibility === 'private') subscriptionsFilter.visibility = 'private'
  if (notification.sender) {
    subscriptionsFilter['sender.type'] = notification.sender.type
    subscriptionsFilter['sender.id'] = notification.sender.id
    if (notification.sender.role) subscriptionsFilter['sender.role'] = notification.sender.role
    if (notification.sender.department) {
      if (notification.sender.department !== '*') {
        subscriptionsFilter['sender.department'] = notification.sender.department
      }
    } else {
      subscriptionsFilter['sender.department'] = { $exists: false }
    }
  } else {
    subscriptionsFilter.sender = { $exists: false }
  }
  if (notification.recipient) {
    subscriptionsFilter['recipient.id'] = notification.recipient.id
  }
  let nbSent = 0
  for await (const subscription of db.collection('subscriptions').find(subscriptionsFilter)) {
    await sendNotification(req, prepareNotifSubscription(notification, subscription))
    nbSent += 1
  }

  // if the notification was directly targetted to the user, no need for a subscription
  // the subscription might still have been used to customize locale, outputs, etc.. but it is not required
  if (notification.recipient && !nbSent && req.query.subscribedOnly !== 'true') {
    await sendNotification(req, notification)
  }

  const webhookSubscriptionssFilter = { ...subscriptionsFilter }
  delete webhookSubscriptionssFilter['recipient.id']
  for await (const webhookSubscription of db.collection('webhook-subscriptions').find(webhookSubscriptionssFilter)) {
    await createWebhook(req, notification, webhookSubscription)
  }

  res.status(200).json(notification)
}))

module.exports = router
