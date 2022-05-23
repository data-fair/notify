let config = { ...require('config') }
config.basePath = new URL(config.publicUrl + '/').pathname

const locales = ['fr', 'en', 'de', 'it', 'es', 'pt']

const isBuilding = process.argv.slice(-1)[0] === 'build'

if (process.env.NODE_ENV === 'production') {
  const nuxtConfigInject = require('@koumoul/nuxt-config-inject')
  if (isBuilding) config = nuxtConfigInject.prepare(config)
  else nuxtConfigInject.replace(config, ['nuxt-dist/**/*', 'public/static/**/*'])
}

let vuetifyOptions = {}

if (process.env.NODE_ENV !== 'production' || isBuilding) {
  const vuetifyLocales = locales.reduce((a, locale) => {
    a[locale] = require('vuetify/es5/locale/' + locale).default
    return a
  }, {})
  vuetifyOptions = {
    customVariables: ['~assets/variables.scss'],
    theme: {
      themes: {
        light: config.theme.colors
      }
    },
    treeShake: true,
    defaultAssets: false,
    lang: {
      locales: vuetifyLocales,
      current: config.i18n.defaultLocale
    }
  }
}

module.exports = {
  telemetry: false,
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
      const webpack = require('webpack')

      // config.optimization.minimize = false
      // Ignore all locale files of moment.js, those we want are loaded in plugins/moment.js
      config.plugins.push(new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/))
    },
    babel: {
      sourceType: 'unambiguous'
    }
  },
  plugins: [
    { src: '~plugins/iframe-resize' },
    { src: '~plugins/session' },
    { src: '~plugins/vuetify' },
    { src: '~plugins/ws' },
    { src: '~plugins/dayjs' },
    { src: '~plugins/localized' }
  ],
  router: {
    base: config.basePath
  },
  modules: ['@nuxtjs/axios', 'cookie-universal-nuxt', ['@nuxtjs/i18n', {
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
  buildModules: [
    '@nuxtjs/vuetify',
    ['@nuxtjs/google-fonts', { download: true, display: 'swap', families: { Nunito: [100, 300, 400, 500, 700, 900] } }]
  ],
  vuetify: vuetifyOptions,
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
  },
  css: [
    '@mdi/font/css/materialdesignicons.min.css'
  ]
}
