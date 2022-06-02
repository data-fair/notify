const assert = require('assert').strict

describe('identities webhooks', () => {
  it('should update recipient and sender name', async () => {
    let subscription = (await global.ax.user1.post('/api/v1/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'user', id: 'user1', name: 'User1' },
      visibility: 'public'
    })).data

    await global.ax.ano.post('/api/v1/identities/user/user1', { name: 'New name' }, { params: { key: 'identities-secret' } })
    subscription = (await global.ax.user1.get('/api/v1/subscriptions/' + subscription._id)).data
    assert.equal(subscription.recipient.name, 'New name')
    assert.equal(subscription.sender.name, 'New name')
  })

  it('should remove deprecated private subscriptions', async () => {
    const privateSubscription = (await global.ax.user1.post('/api/v1/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga1', name: 'Orga 1' },
      visibility: 'private'
    })).data
    assert.equal(privateSubscription.visibility, 'private')

    const publicSubscription = (await global.ax.user1.post('/api/v1/subscriptions', {
      topic: { key: 'topic2' },
      sender: { type: 'organization', id: 'orga1', name: 'Orga 1' },
      visibility: 'public'
    })).data

    const org2Subscription = (await global.ax.user1.post('/api/v1/subscriptions', {
      topic: { key: 'topic3' },
      sender: { type: 'organization', id: 'orga2', name: 'Orga 2', department: 'dep1' },
      visibility: 'private'
    })).data
    assert.equal(org2Subscription.visibility, 'private')

    await global.ax.ano.post('/api/v1/identities/user/user1', { name: 'New name', organizations: [{ id: 'orga2', role: 'user' }] }, { params: { key: 'identities-secret' } })

    let subscriptions = (await global.ax.user1.get('/api/v1/subscriptions')).data.results
    assert.ok(!subscriptions.find(s => s._id === privateSubscription._id))
    assert.ok(subscriptions.find(s => s._id === publicSubscription._id))
    assert.ok(subscriptions.find(s => s._id === org2Subscription._id))

    await global.ax.ano.post('/api/v1/identities/user/user1', { name: 'New name', organizations: [{ id: 'orga2', role: 'user', department: 'dep2' }] }, { params: { key: 'identities-secret' } })
    subscriptions = (await global.ax.user1.get('/api/v1/subscriptions')).data.results
    assert.ok(!subscriptions.find(s => s._id === org2Subscription._id))

    const allRolesSubscription = (await global.ax.admin1.post('/api/v1/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga1', name: 'Orga 1' },
      visibility: 'private'
    })).data
    const adminSubscription = (await global.ax.admin1.post('/api/v1/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga1', name: 'Orga 1', role: 'admin' },
      visibility: 'private'
    })).data
    assert.equal(adminSubscription.visibility, 'private')
    await global.ax.ano.post('/api/v1/identities/user/admin1', { name: 'New name', organizations: [{ id: 'orga1', role: 'user' }] }, { params: { key: 'identities-secret' } })
    subscriptions = (await global.ax.admin1.get('/api/v1/subscriptions')).data.results
    assert.ok(subscriptions.find(s => s._id === allRolesSubscription._id))
    assert.ok(!subscriptions.find(s => s._id === adminSubscription._id))
  })
})
