module.exports = {
  secretKeys: {
    notifications: 'notifications-secret',
    sendMails: 'sendmails-secret'
  },
  proxyNuxt: true,
  emailsGrouping: {
    cron: '* * * * *' // every minute
  },
  digest: {
    cron: '* * * * *' // every minute
  }
}
