const express = require('express')
const shortid = require('shortid')
const config = require('config')
const axios = require('axios')
const ajv = require('ajv')()
const schema = require('../../contract/notification')(config.i18n.locales.split(','))
const validate = ajv.compile(schema)
const asyncWrap = require('../utils/async-wrap')
const findUtils = require('../utils/find')
const auth = require('../utils/auth')
const urlTemplate = require('url-template')
const debug = require('debug')('notifications')
const router = express.Router()

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

  const countPromise = notifications.countDocuments(query)
  const countNewPromise = pointer ? notifications.countDocuments({ ...query, date: { $gt: pointer.date } }) : countPromise
  const [results, count, countNew] = await Promise.all([resultsPromise, countPromise, countNewPromise])
  results.forEach(notif => {
    if (!pointer || notif.date > pointer.date) notif.new = true
  })
  res.json({ results, count, countNew })
}))

const localizeProp = (prop, locale) => {
  if (prop && typeof prop === 'object') return prop[locale || config.i18n.defaultLocale] || prop[config.i18n.defaultLocale]
  return prop
}
const localize = (notif) => {
  return { ...notif, title: localizeProp(notif.title, notif.locale), body: localizeProp(notif.body, notif.locale) }
}

const prepareNotifSubscription = (originalNotification, subscription) => {
  const notification = {
    icon: subscription.icon || config.theme.notificationIcon || config.theme.logo || (config.publicUrl + '/logo-192x192.png'),
    locale: subscription.locale,
    ...originalNotification, // this is after setting icon/locale, so it takes precedence
    _id: shortid.generate(),
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
  await req.app.get('db').collection('notifications').insertOne(notification)
  debug('Send WS notif', notification.recipient, notification)
  req.app.get('publishWS')([`user:${notification.recipient.id}:notifications`], notification)
  if (notification.outputs.includes('devices')) {
    debug('Send notif to devices')
    req.app.get('push')(notification).catch(err => console.error('Failed to send push notification', err))
  }
  if (notification.outputs.includes('email')) {
    debug('Send notif to email address')
    let text = notification.body || ''
    let html = `<p>${notification.body || ''}</p>`
    if (notification.url) {
      text += '\n\n' + notification.url
      html += `<p>${req.__({ phrase: 'seeAt', locale: notification.locale })} <a href="${notification.url}">${new URL(notification.url).host}</a></p>`
    }
    const mail = {
      to: [{ type: 'user', ...notification.recipient }],
      subject: notification.title,
      text,
      html
    }
    debug('Send mail notif', notification.recipient, mail, notification)
    axios.post(config.directoryUrl + '/api/mails', mail, { params: { key: config.secretKeys.sendMails } }).catch(err => {
      console.error('Failed to send mail', err)
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
  }

  notification.visibility = notification.visibility ?? 'private'
  notification.date = new Date().toISOString()
  const valid = validate(notification)
  if (!valid) return res.status(400).send(validate.errors)

  // prepare the filter to find the topics matching this subscription
  const topicParts = notification.topic.key.split(':')
  const topicKeys = topicParts.map((part, i) => topicParts.slice(0, i + 1).join(':'))
  const filter = { 'topic.key': { $in: topicKeys } }
  if (notification.visibility === 'private') filter.visibility = 'private'
  if (notification.sender) {
    filter['sender.type'] = notification.sender.type
    filter['sender.id'] = notification.sender.id
  } else {
    filter.sender = { $exists: false }
  }
  if (notification.recipient) {
    filter['recipient.id'] = notification.recipient.id
  }
  let nbSent = 0
  for await (const subscription of db.collection('subscriptions').find(filter)) {
    await sendNotification(req, prepareNotifSubscription(notification, subscription))
    nbSent += 1
  }

  // if the notification was directly targetted to the user, no need for a subscription
  // the subscription might still have been used to customize locale, outputs, etc.. but it is not required
  if (notification.recipient && !nbSent) {
    await sendNotification(req, notification)
  }

  res.status(200).json(notification)
}))

module.exports = router
