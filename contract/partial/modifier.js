module.exports = {
  type: 'object',
  additionalProperties: false,
  required: ['date'],
  readOnly: true,
  properties: {
    id: {
      type: 'string',
      description: 'Id of the user that created this issue'
    },
    name: {
      type: 'string',
      description: 'Name of the user that created this issue'
    },
    date: {
      type: 'string',
      description: 'Creation date of this issue',
      format: 'date-time'
    }
  }
}
