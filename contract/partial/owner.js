module.exports = {
  type: 'object',
  title: 'Propriétaire',
  additionalProperties: false,
  required: ['type', 'id'],
  readOnly: true,
  properties: {
    type: {
      type: 'string',
      enum: ['user', 'organization'],
      title: 'Type'
    },
    id: {
      type: 'string',
      description: 'The unique id of the user or organization'
    },
    name: {
      type: 'string',
      description: 'The display name of the user or organization'
    },
    role: {
      type: 'string',
      deprecated: true,
      description: 'If this is set and owner is an organization, this restrict ownership to users of this organization having this role or admin role'
    },
    department: {
      type: 'string',
      description: 'If this is set and owner is an organization, this gives ownership to users of this organization that belong to this department'
    }
  }
}
