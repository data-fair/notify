// use push-notifications to send notifications to devices
// by web push for now, using propriétary protocols for mobile devices later on

const fs = require('fs-extra')
const config = require('config')
const webpush = require('web-push')
const PushNotifications = require('node-pushnotifications')
const useragent = require('useragent')
const dayjs = require('dayjs')
const asyncWrap = require('./async-wrap')
const prometheus = require('./prometheus')
const debug = require('debug')('notifications')

fs.ensureDirSync('./security')
let vapidKeys
if (!fs.existsSync('./security/vapid.json')) {
  vapidKeys = webpush.generateVAPIDKeys()
  fs.writeJsonSync('./security/vapid.json', vapidKeys)
} else {
  vapidKeys = fs.readJsonSync('./security/vapid.json')
}

function equalReg (reg1, reg2) {
  const val1 = typeof reg1 === 'object' ? reg1.endpoint : reg1
  const val2 = typeof reg2 === 'object' ? reg2.endpoint : reg2
  return val1 === val2
}

exports.init = async (db) => {
  const settings = {
    web: {
      vapidDetails: {
        subject: 'mailto:Koumoul <contact@koumoul.com>',
        publicKey: vapidKeys.publicKey,
        privateKey: vapidKeys.privateKey
      },
      gcmAPIKey: config.gcmAPIKey
    }
  }
  if (config.apn.token.key) {
    settings.apn = config.apn
  }
  const pushNotifications = new PushNotifications(settings)
  return async (notification) => {
    const ownerFilter = { 'owner.type': 'user', 'owner.id': notification.recipient.id }
    const pushSub = await db.collection('pushSubscriptions').findOne(ownerFilter)
    if (!pushSub) return []
    const errors = []
    for (const registration of pushSub.registrations) {
      if (registration.disabled) continue
      if (registration.disabledUntil) {
        if (registration.disabledUntil > dayjs().toISOString()) continue
        delete registration.disabledUntil
      }
      prometheus.sentNotifications.inc({ output: 'device-' + registration.type })

      const pushNotif = {
        ...notification,
        badge: config.theme.notificationBadge || (config.publicUrl + '/badge-72x72.png'),
        ...config.defaultPushNotif[registration.type || 'webpush']
      }
      delete pushNotif.recipient
      const res = await pushNotifications.send([registration.id], pushNotif)
      debug('Send push notif', notification.recipient.id, registration, pushNotif, res[0])
      const error = res[0].message.filter(m => !!m.error)[0]
      if (error) {
        prometheus.pushDeviceErrors.inc({ output: 'device-' + registration.type, statusCode: error.error?.statusCode })
        errors.push(error)
        if (error.error && error.error.statusCode === 410) {
          console.log('registration has unsubscribed or expired, disable it', error.error.body || error.error.response || error.error.statusCode, JSON.stringify(registration))
          registration.disabled = 'gone' // cf https://developer.mozilla.org/fr/docs/Web/HTTP/Status/410
          delete registration.lastErrors
        } else {
          registration.lastErrors = registration.lastErrors || []
          registration.lastErrors.push(error.error?.statusCode ? error.error : error?.errorMsg)
          if (registration.lastErrors.length >= 10) {
            registration.disabled = 'errors'
            console.warn('registration returned too many errors, disable it', error.error, JSON.stringify(registration))
          } else {
            registration.disabledUntil = dayjs().add(Math.ceil(Math.pow(registration.lastErrors.length, 2.5)), 'minute').toISOString()
            console.warn('registration returned an error, progressively backoff', error.error, JSON.stringify(registration))
          }
        }
      } else {
        delete registration.lastErrors
        registration.lastSuccess = dayjs().toISOString()
      }
    }
    await db.collection('pushSubscriptions').updateOne(ownerFilter, { $set: { registrations: pushSub.registrations } })
    return errors
  }
}

const router = exports.router = require('express').Router()

router.get('/vapidkey', (req, res) => {
  res.send({ publicKey: vapidKeys.publicKey })
})

router.get('/registrations', asyncWrap(async (req, res) => {
  if (!req.user) return res.status(401).send()
  const db = await req.app.get('db')
  const ownerFilter = { 'owner.type': 'user', 'owner.id': req.user.id }
  const sub = await db.collection('pushSubscriptions').findOne(ownerFilter)
  const registrations = (sub && sub.registrations) || []
  registrations.forEach(r => { r.type = r.type || 'webpush' })
  res.send(registrations)
}))

router.put('/registrations', asyncWrap(async (req, res) => {
  if (!req.user) return res.status(401).send()
  const db = await req.app.get('db')
  const ownerFilter = { 'owner.type': 'user', 'owner.id': req.user.id }
  await db.collection('pushSubscriptions').updateOne(ownerFilter, { $set: { registrations: req.body } })
  res.send(req.body)
}))

// a shortcut to register current device
router.post('/registrations', asyncWrap(async (req, res) => {
  if (!req.user) return res.status(401).send()
  if (!req.body.id) return res.status(400).send('id is required')
  const db = await req.app.get('db')
  const agent = useragent.parse(req.headers['user-agent'])
  const date = new Date().toISOString()
  const registration = { ...req.body, date }
  if (!registration.type) registration.type = 'webpush'
  if (!registration.deviceName) registration.deviceName = agent.toString()

  const ownerFilter = { 'owner.type': 'user', 'owner.id': req.user.id }
  let sub = await db.collection('pushSubscriptions').findOne(ownerFilter)
  if (!sub) {
    sub = {
      owner: { type: 'user', id: req.user.id, name: req.user.name },
      registrations: []
    }
  }
  if (!sub.registrations.find(r => equalReg(r.id, req.body.id))) {
    sub.registrations.push(registration)
    await db.collection('pushSubscriptions').replaceOne(ownerFilter, sub, { upsert: true })
    const errors = await req.app.get('push')({
      recipient: req.user,
      title: 'Un nouvel appareil recevra vos notifications',
      body: `L'appareil ${registration.deviceName} est confirmé comme destinataire de vos notifications.`,
      date,
      icon: config.theme.notificationIcon || config.theme.logo || (config.publicUrl + '/logo-192x192.png')
    })
    if (errors.length) return res.status(500).send(errors)
  }
  res.send()
}))
