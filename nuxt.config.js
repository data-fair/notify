const webpack = require('webpack')
let config = { ...require('config') }
config.basePath = new URL(config.publicUrl + '/').pathname

const locales = ['fr', 'en', 'de', 'it', 'es', 'pt']

const vuetifyLocales = locales.reduce((a, locale) => {
  a[locale] = require('vuetify/es5/locale/' + locale).default
  return a
}, {})

if (process.env.NODE_ENV === 'production') {
  const nuxtConfigInject = require('@koumoul/nuxt-config-inject')
  if (process.argv.slice(-1)[0] === 'build') config = nuxtConfigInject.prepare(config)
  else nuxtConfigInject.replace(config, ['nuxt-dist/**/*', 'public/static/**/*'])
}

module.exports = {
  target: 'server',
  ssr: false,
  components: true,
  srcDir: 'public/',
  buildDir: 'nuxt-dist',
  build: {
    // Necessary for "à la carte" import of vuetify components
    transpile: [/@koumoul/],
    // always the same url to fetch static resource, event in multi-domain mode
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
    locales,
    defaultLocale: config.i18n.defaultLocale,
    vueI18nLoader: true,
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_lang'
    },
    vueI18n: {
      fallbackLocale: config.i18n.defaultLocale
    }
  }]],
  axios: {
    browserBaseURL: config.basePath
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
      locales: vuetifyLocales,
      current: 'fr'
    }
  },
  env: {
    basePath: config.basePath,
    directoryUrl: config.directoryUrl,
    theme: config.theme,
    i18n: config.i18n
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
