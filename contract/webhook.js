const sender = require('./partial/sender')
const owner = require('./partial/owner')
const topicRef = require('./partial/topic-ref')

module.exports = (locales, noSingleLocale = false) => {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['subscription'],
    properties: {
      _id: {
        type: 'string',
        title: 'Identifiant'
      },
      // the sender is the owner of the topic
      sender,
      owner,
      subscription: {
        type: 'object',
        _id: {
          type: 'string',
          title: 'Identifiant'
        },
        title: {
          type: 'string',
          title: 'Libellé de la souscription'
        }
      },
      notification: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
          topic: topicRef,
          url: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
          extra: { type: 'object' }
        }
      },
      status: {
        type: 'string',
        enum: ['waiting', 'working', 'ok', 'error', 'cancelled']
      },
      nbAttempts: { type: 'integer' },
      lastAttempt: {
        type: 'object',
        properties: {
          date: { type: 'string', format: 'date-time' },
          status: { type: 'integer' },
          error: { type: 'string' }
        }
      },
      nextAttempt: {
        type: 'string',
        format: 'date-time'
      }
    }
  }
}
