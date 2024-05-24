module.exports = {
  secretKeys: {
    notifications: 'notifications-secret',
    sendMails: 'sendmails-secret'
  },
  proxyNuxt: true,
  emailsGrouping: {
    cron: '0/1 * * * *' // every minute
  }
}
