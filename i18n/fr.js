// WARN: do not use underscore in keys, it is used as delimiter when reading
// messages from environment variables

module.exports = {
  root: {
    title: 'Notify'
  },
  common: {
    confirm: 'confirmer'
  },
  pages: {
    subscribe: {
      notifyMe: 'Me notifier pour {title}.',
      registerDevice: 'Ajouter cet appareil comme destinataire permanent de vos notifications ?',
      notification: 'notification',
      email: 'email'
    }
  },
  errors: {},
  mails: {}
}
