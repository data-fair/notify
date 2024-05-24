module.exports = {
  privateDirectoryUrl: 'http://localhost:8080',
  secretKeys: {
    identities: 'identities-secret',
    notifications: 'notifications-secret',
    sendMails: 'sendmails-secret'
  },
  prometheus: {
    port: 9092
  },
  emailsGrouping: {
    cron: '* * * * * *' // every second
  }
}
