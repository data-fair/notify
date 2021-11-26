const owner = require('./partial/owner')
const recipient = require('./partial/recipient')
const modifier = require('./partial/modifier')
const topicRef = require('./partial/topic-ref')

module.exports = (locales) => ({
  type: 'object',
  additionalProperties: false,
  required: ['topic', 'recipient', 'outputs'],
  properties: {
    _id: {
      type: 'string',
      title: 'Identifiant',
      readOnly: true
    },
    title: {
      type: 'string',
      title: 'Libellé de la souscription'
    },
    locale: {
      type: 'string',
      title: 'Langue de la souscription',
      default: 'fr',
      enum: locales
    },
    // the sender is the owner of the topic
    sender: owner,
    topic: topicRef,
    recipient,
    outputs: {
      type: 'array',
      title: 'Sorties',
      default: ['devices'],
      items: {
        type: 'string',
        oneOf: [{
          const: 'devices',
          title: 'recevoir la notification sur vos appareils configurés'
        }, {
          const: 'email',
          title: 'recevoir la notification par email'
        }]
      }
    },
    urlTemplate: {
      type: 'string',
      title: 'Template de lien'
    },
    visibility: {
      type: 'string',
      title: 'Visibilité des notifications à recevoir',
      enum: ['public', 'private'],
      default: 'private',
      readOnly: true
    },
    icon: {
      type: 'string',
      title: 'Icone'
    },
    created: modifier,
    updated: modifier
  }
})
