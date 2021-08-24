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
      notifyMe: 'Avvisami per {title}.',
      registerDevice: 'Vuoi aggiungere questo dispositivo come destinatario permanente delle tue notifiche?',
      notification: 'notifica',
      email: 'email'
    }
  },
  errors: {},
  mails: {}
}
