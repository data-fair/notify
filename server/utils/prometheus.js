/* eslint-disable no-new */
// code instrumentation to expose metrics for prometheus
// follow this doc for naming conventions https://prometheus.io/docs/practices/naming/
// /metrics serves container/process/pod specific metrics while /global-metrics
// serves metrics for the whole data-fair installation no matter the scaling

const config = require('config')
const express = require('express')
const client = require('prom-client')
const eventToPromise = require('event-to-promise')
const { createHttpTerminator } = require('http-terminator')
const asyncWrap = require('./async-wrap')

const localRegister = new client.Registry()
const globalRegister = new client.Registry()

// metrics server
const app = express()
const server = require('http').createServer(app)
const httpTerminator = createHttpTerminator({ server })

app.get('/metrics', asyncWrap(async (req, res) => {
  res.set('Content-Type', localRegister.contentType)
  res.send(await localRegister.metrics())
}))
app.get('/global-metrics', asyncWrap(async (req, res) => {
  res.set('Content-Type', globalRegister.contentType)
  res.send(await globalRegister.metrics())
}))

// local metrics incremented throughout the code
exports.internalError = new client.Counter({
  name: 'df_internal_error',
  help: 'Errors in some worker process, socket handler, etc.',
  labelNames: ['errorCode'],
  registers: [localRegister]
})
exports.receivedNotifications = new client.Counter({
  name: 'df_notify_received_notifications_total',
  help: 'Number of notifications received by the notify service',
  registers: [localRegister]
})
exports.sentNotifications = new client.Counter({
  name: 'df_notify_sent_notifications_total',
  help: 'Number of notifications sent to outgoing channels',
  labelNames: ['output'],
  registers: [localRegister]
})
exports.pushDeviceErrors = new client.Counter({
  name: 'df_notify_push_device_errors_total',
  help: 'Number of errors while pushing notifications to devices',
  labelNames: ['output', 'statusCode'],
  registers: [localRegister]
})

exports.start = async (db) => {
  // global metrics based on db connection

  new client.Gauge({
    name: 'df_notify_subscriptions_total',
    help: 'Total number of subscriptions',
    registers: [globalRegister],
    async collect () {
      this.set(await db.collection('subscriptions').estimatedDocumentCount())
    }
  })
  new client.Gauge({
    name: 'df_notify_notifications_total',
    help: 'Total number of stored notifications',
    registers: [globalRegister],
    async collect () {
      this.set(await db.collection('notifications').estimatedDocumentCount())
    }
  })
  new client.Gauge({
    name: 'df_notify_webhook_subscriptions_total',
    help: 'Total number of webhook subscriptions',
    registers: [globalRegister],
    async collect () {
      this.set(await db.collection('webhook-subscriptions').estimatedDocumentCount())
    }
  })
  new client.Gauge({
    name: 'df_notify_webhooks_total',
    help: 'Total number of stored webhooks',
    registers: [globalRegister],
    async collect () {
      this.set(await db.collection('webhooks').estimatedDocumentCount())
    }
  })

  server.listen(config.prometheus.port)
  await eventToPromise(server, 'listening')
  console.log('Prometheus metrics server listening on http://localhost:' + config.prometheus.port)
}

exports.stop = async () => {
  await httpTerminator.terminate()
}
