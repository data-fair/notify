// WARN: do not use underscore in keys, it is used as delimiter when reading
// messages from environment variables

module.exports = {
  root: {
    title: 'Notify'
  },
  common: {
    ok: 'ok'
  },
  pages: {
    subscribe: {
      notifyMe: 'Notify me about {title}.',
      registerDevice: 'Add this device as a permanent recipient of your notifications?',
      notification: 'notification',
      email: 'email'
    }
  },
  errors: {},
  mails: {}
}
