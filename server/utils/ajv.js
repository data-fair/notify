const Ajv = require('ajv')
const addFormats = require('ajv-formats')

const ajv = new Ajv({ strict: false })
addFormats(ajv)

module.exports = ajv
