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
      notifyMe: 'Notifique-me para {title}.',
      registerDevice: 'Adicionar este dispositivo como um destinatário permanente de suas notificações?',
      notification: 'notificação',
      email: 'email'
    }
  },
  errors: {},
  mails: {}
}
