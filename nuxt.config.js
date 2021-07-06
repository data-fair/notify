const webpack = require('webpack')
let config = require('config')
const i18n = require('./i18n')
config.basePath = new URL(config.publicUrl + '/').pathname
config.i18nMessages = i18n.messages
config.i18nLocales = config.i18n.locales.join(',')

const fr = require('vuetify/es5/locale/fr').default

if (process.env.NODE_ENV === 'production') {
  const nuxtConfigInject = require('@koumoul/nuxt-config-inject')
  if (process.argv.slice(-1)[0] === 'build') config = nuxtConfigInject.prepare(config)
  else nuxtConfigInject.replace(config, ['nuxt-dist/**/*', 'public/static/**/*'])
}

module.exports = {
  ssr: false,
  srcDir: 'public/',
  buildDir: 'nuxt-dist',
  build: {
    transpile: [/@koumoul/], // Necessary for "à la carte" import of vuetify components
    publicPath: config.publicUrl + '/_nuxt/',
    extend (config, { isServer, isDev, isClient }) {
      // config.optimization.minimize = false
      // Ignore all locale files of moment.js, those we want are loaded in plugins/moment.js
      config.plugins.push(new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/))
    },
    babel: {
      sourceType: 'unambiguous'
    }
  },
  plugins: [
    { src: '~plugins/iframe-resize', ssr: false },
    { src: '~plugins/session', ssr: false },
    { src: '~plugins/ws', ssr: false },
    { src: '~plugins/moment' },
    { src: '~plugins/localized' }
  ],
  router: {
    base: config.basePath
  },
  modules: ['@nuxtjs/axios', 'cookie-universal-nuxt', ['nuxt-i18n', {
    seo: false,
    // cannot come from config as it must be defined at build time (routes are impacted
    // we will override some of it at runtime using env.i18n
    locales: i18n.locales,
    defaultLocale: i18n.defaultLocale,
    vueI18n: {
      fallbackLocale: i18n.defaultLocale,
      messages: config.i18nMessages
    },
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_lang',
      alwaysRedirect: true
    }
  }]],
  axios: {
    browserBaseURL: config.publicUrl + '/',
    baseURL: `http://localhost:${config.port}/`
  },
  buildModules: ['@nuxtjs/vuetify'],
  vuetify: {
    icons: {
      iconfont: 'mdi'
    },
    theme: {
      themes: {
        light: config.theme.colors
      }
    },
    lang: {
      locales: { fr },
      current: 'fr'
    }
  },
  env: {
    publicUrl: config.publicUrl,
    wsPublicUrl: config.wsPublicUrl,
    directoryUrl: config.directoryUrl,
    theme: config.theme,
    i18nLocales: config.i18nLocales
  },
  head: {
    title: 'Notify',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'application', name: 'application-name', content: 'Notify' },
      { hid: 'description', name: 'description', content: 'Push notifications to your users.' },
      { hid: 'robots', name: 'robots', content: 'noindex' }
    ]
  }
}
