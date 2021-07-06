const owner = require('./partial/owner')
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
      title: noSingleLocale ? i18nMsg('Titre') : {
        oneOf: [{
          type: 'string',
          title: 'Titre'
        }, i18nMsg('Titre')]
      },
      body: noSingleLocale ? i18nMsg('Contenu') : {
        oneOf: [{
          type: 'string',
          title: 'Contenu'
        }, i18nMsg('Contenu')]
      },
      icon: {
        type: 'string',
        title: `URL de l'icone de la notification`
      },
      // sender is the owner of the topic
      sender: owner,
      topic: topicRef,
      // it will be the recipient of the matched subscription
      recipient,
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
