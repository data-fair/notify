const config = require('config')
const fs = require('fs-extra')
const axios = require('axios')
const debug = require('debug')('test')
const app = require('../server/app')
const axiosAuth = require('@data-fair/sd-express').axiosAuth

before('init globals', async () => {
  debug('init globals')
  const { db, client } = await require('../server/utils/db.js').connect()
  global.db = db
  global.mongoClient = client

  global.ax = {}
  global.ax.builder = async (email, org, opts = {}) => {
    debug('prepare axios instance', email)
    opts.baseURL = config.publicUrl

    let ax
    if (email) ax = await axiosAuth(email, org, opts)
    else ax = axios.create(opts)

    // customize axios errors for shorter stack traces when a request fails in a test
    ax.interceptors.response.use(response => response, error => {
      if (!error.response) return Promise.reject(error)
      delete error.response.request
      return Promise.reject(error.response)
    })
    debug('axios instance ok')
    return ax
  }
  await Promise.all([
    global.ax.builder().then(ax => { global.ax.ano = ax }),
    global.ax.builder(null, null, { params: { key: config.secretKeys.notifications } }).then(ax => { global.ax.push = ax }),
    global.ax.builder('superadmin@test.com:superpasswd:adminMode').then(ax => { global.ax.superadmin = ax }),
    global.ax.builder('admin1@test.com:passwd').then(ax => { global.ax.admin1 = ax }),
    global.ax.builder('user1@test.com:passwd').then(ax => { global.ax.user1 = ax }),
    global.ax.builder('user1@test.com:passwd', 'orga1').then(ax => { global.ax.user1orga1 = ax }),
    global.ax.builder('user2@test.com:passwd').then(ax => { global.ax.user2 = ax })
  ])

  debug('init globals ok')
})

before('scratch all', async () => {
  debug('scratch all')
  await global.db.dropDatabase()
  await fs.remove('./data/test')
  debug('scratch all ok')
})

before('start app', async function () {
  debug('run app')
  try {
    global.app = await app.start()
  } catch (err) {
    console.error('Failed to run the application', err)
    throw err
  }
  debug('app ok')
})

beforeEach('scratch data', async () => {
  debug('scratch data')
  try {
    await Promise.all([
      global.db.collection('notifications').deleteMany({}),
      global.db.collection('subscriptions').deleteMany({})
    ])
  } catch (err) {
    console.warn('error while scratching data before test', err)
  }
  global.events.removeAllListeners()
  debug('scratch data ok')
})

after('stop app', async () => {
  debug('stop app')
  await Promise.race([
    new Promise(resolve => setTimeout(resolve, 5000)),
    app.stop()
  ])
  debug('stop app ok')
})

after('cleanup globals', async () => {
  debug('cleanup globals')
  await global.mongoClient.close()
  debug('cleanup globals ok')
})
