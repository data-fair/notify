const sender = require('./partial/sender')
const recipient = require('./partial/recipient')
const topicRef = require('./partial/topic-ref')

module.exports = (locales, noSingleLocale = false) => {
  const i18nMsg = (title) => ({
    type: 'object',
    title: `${title} internationalisé`,
    properties: locales.reduce((props, locale) => { props[locale] = { type: 'string', title: locale }; return props }, {})
  })
  return {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'topic'],
    properties: {
      _id: {
        type: 'string',
        title: 'Identifiant',
        readOnly: true
      },
      title: noSingleLocale
        ? i18nMsg('Titre')
        : {
            oneOf: [{
              type: 'string',
              title: 'Titre'
            }, i18nMsg('Titre')]
          },
      body: noSingleLocale
        ? i18nMsg('Contenu')
        : {
            oneOf: [{
              type: 'string',
              title: 'Contenu'
            }, i18nMsg('Contenu')]
          },
      htmlBody: noSingleLocale
        ? i18nMsg('Contenu HTML')
        : {
            oneOf: [{
              type: 'string',
              title: 'Contenu HTML'
            }, i18nMsg('Contenu HTML')]
          },
      locale: {
        type: 'string',
        title: 'Langue de la notification',
        enum: locales
      },
      icon: {
        type: 'string',
        title: 'URL de l\'icone de la notification'
      },
      // sender is the owner of the topic
      sender,
      topic: topicRef,
      // it will be the recipient of the matched subscription, or explicitly defined without requiring a subscription
      recipient,
      outputs: {
        type: 'array',
        title: 'Sorties',
        items: {
          type: 'string',
          oneOf: [{
            const: 'devices',
            title: 'recevoir la notification sur vos appareils configurés'
          }, {
            const: 'email',
            title: 'recevoir la notification par email'
          }, {
            const: 'digest',
            title: 'inclure la notification dans un résumé hebdomadaire'
          }]
        }
      },
      urlParams: {
        type: 'object',
        title: 'utilisé pour renseigner subscription.urlTemplate et ainsi créer url',
        patternProperties: {
          '.*': { type: 'string' }
        }
      },
      url: {
        type: 'string',
        title: 'peut être calculé à partir de subscription.urlTemplate et notification.urlParams',
        readOnly: true
      },
      visibility: {
        type: 'string',
        title: 'Visibilité',
        enum: ['public', 'private'],
        default: 'private'
      },
      date: {
        readOnly: true,
        type: 'string',
        description: 'reception date',
        format: 'date-time'
      },
      new: {
        readOnly: true,
        type: 'boolean'
      },
      extra: {
        type: 'object',
        description: 'propriétés libres qui varient en fonction du type de notification'
      }
    }
  }
}
