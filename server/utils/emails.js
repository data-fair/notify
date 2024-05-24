const config = require('config')
const axios = require('./axios')
const { i18n } = require('./i18n')

const DIRECTORY_URL = config.privateDirectoryUrl || config.directoryUrl

/**
 * @param {any} notification
 */
exports.getNotifMailBody = (notification, withTitle = false) => {
  let text = ''
  let html = ''
  if (withTitle) {
    text += notification.title
    if (notification.body) text += '\n\n'
    html += `<h2>${notification.title}</h2>`
  }
  if (notification.body) text += notification.body

  let simpleHtml = `<p>${notification.body || ''}</p>`
  if (notification.url) {
    text += '\n\n' + notification.url
    simpleHtml += `<p>${i18n.__({ phrase: 'seeAt', locale: notification.locale })} <a href="${notification.url}">${new URL(notification.url).host}</a></p>`
  }
  html += notification.htmlBody || simpleHtml
  return { text, html }
}

/**
 * @param {any} mail
 */
exports.sendMail = async (mail) => {
  await axios.post(DIRECTORY_URL + '/api/mails', mail, { params: { key: config.secretKeys.sendMails } })
}

/**
 * @param {any[]} notifications
 */
exports.sendNotifications = async (notifications) => {
  if (!notifications.length) return

  const mail = { to: [{ type: 'user', ...notifications[0].recipient }], subject: '', text: '', html: '' }
  if (notifications.length === 1) {
    const notification = notifications[0]
    mail.subject = notification.title
    Object.assign(mail, exports.getNotifMailBody(notification))
  } else {
    mail.subject = notifications.map(n => n.title).join(', ')
    if (mail.subject.length > 80) mail.subject = mail.subject.slice(0, 80) + '...'
    for (let i = 0; i < notifications.length; i++) {
      const { text: notifText, html: notifHtml } = exports.getNotifMailBody(notifications[i], true)
      if (i > 0) {
        mail.text += '\n----------\n'
        mail.html += '<hr>'
      }
      mail.text += notifText
      mail.html += notifHtml
    }
  }
  await exports.sendMail(mail)
}
