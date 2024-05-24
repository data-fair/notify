module.exports = {
  port: 5994,
  publicUrl: 'http://localhost:5994',
  directoryUrl: 'http://localhost:5994/simple-directory',
  privateDirectoryUrl: null,
  mongo: {
    url: 'mongodb://localhost:27017/notify-' + (process.env.NODE_ENV || 'development'),
    options: {}
  },
  // secrets that can be used to configure global webhooks for example to update users and organizations
  secretKeys: {
    identities: null,
    notifications: null,
    sendMails: null
  },
  gcmAPIKey: null,
  apn: {
    token: {
      key: null,
      keyId: null,
      teamId: null
    },
    production: false
  },
  defaultPushNotif: {
    apn: {},
    webpush: {}
  },
  theme: {
    logo: null,
    notificationIcon: null,
    notificationBadge: null,
    colors: {
      // standard vuetify colors
      primary: '#1E88E5', // blue.darken1
      secondary: '#42A5F5', // blue.lighten1,
      accent: '#FF9800', // orange.base
      error: 'FF5252', // red.accent2
      info: '#2196F3', // blue.base
      success: '#4CAF50', // green.base
      warning: '#E91E63', // pink.base
      admin: '#E53935' // red.darken1
    }
  },
  i18n: {
    locales: 'fr,en',
    defaultLocale: 'fr'
  },
  proxyNuxt: false,
  worker: {
    loopInterval: 4000
  },
  prometheus: {
    active: true,
    port: 9090
  },
  emailsGrouping: {
    cron: '0/4 * * * *' // every 4 minutes
  },
  digest: {
    // weekly by default
    // TODO: make this configurable ?
    cron: '0 6 * * 7', // six AM every sunday
    maxItems: 10
  }
}
