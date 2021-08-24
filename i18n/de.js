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
      notifyMe: 'Benachrichtige mich wegen {title}.',
      registerDevice: 'Dieses Gerät als dauerhaften Empfänger Ihrer Benachrichtigungen hinzufügen?',
      notification: 'benachrichtigung',
      email: 'email'
    }
  },
  errors: {},
  mails: {}
}
