const owner = require('./partial/owner')
const sender = require('./partial/sender')
const modifier = require('./partial/modifier')
const topicRef = require('./partial/topic-ref')

module.exports = {
  type: 'object',
  additionalProperties: false,
  required: ['topic', 'owner', 'url'],
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
    // the sender is the owner of the topic
    sender,
    owner,
    topic: topicRef,
    url: { title: 'URL du webhook', type: 'string' },
    header: {
      title: 'Header HTTP de sécurisation du webhook',
      type: 'object',
      properties: {
        key: { type: 'string', title: 'Clé', 'x-cols': 6 },
        value: { type: 'string', title: 'Valeur', 'x-cols': 6 } // TODO: encrypt this value
      }
    },
    visibility: {
      type: 'string',
      title: 'Visibilité des notifications à recevoir',
      enum: ['public', 'private'],
      default: 'private',
      readOnly: true
    },
    created: modifier,
    updated: modifier
  }
}
