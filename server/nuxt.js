const nuxtBuildCache = require('@koumoul/nuxt-build-cache')

const nuxtConfig = require('../nuxt.config.js')
const version = process.env.VERSION || require('../package.json').version

module.exports = async () => {
  if (process.env.NODE_ENV === 'development') {
    // in dev mode the nuxt dev server is already running, we re-expose it
    return require('http-proxy-middleware')({ target: 'http://localhost:3000' })
  } else if (process.env.NODE_ENV === 'test') {
    // no UI during tests
    return (req, res, next) => next()
  } else {
    // Prepare nuxt for rendering and serving UI
    const nuxt = await nuxtBuildCache.prepare('notify', version, nuxtConfig)
    return async (req, res, next) => {
      // re-apply the prefix that was removed by our reverse proxy in prod configs
      req.url = (nuxtConfig.router.base + req.url).replace('//', '/')
      nuxt.render(req, res)
    }
  }
}
