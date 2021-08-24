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
      notifyMe: 'Notificarme por {title}.',
      registerDevice: '¿Agregar este dispositivo como destinatario permanente de sus notificaciones?',
      notification: 'notificación',
      email: 'email'
    }
  },
  errors: {},
  mails: {}
}
