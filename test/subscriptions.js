const assert = require('assert').strict

describe('Subscriptions', () => {
  it('should reject wrong recipient', async () => {
    await assert.rejects(global.ax.user1.post('/api/v1/subscriptions', {
      topic: { key: 'topic1' },
      recipient: { id: 'anotheruser' }
    }), (err) => {
      assert.equal(err.status, 403)
      return true
    })
  })

  it('should send a public notification to any subscribed user', async () => {
    const subscription = {
      topic: { key: 'topic1' },
      sender: { type: 'user', id: 'user1' },
      visibility: 'public'
    }
    await global.ax.admin1.post('/api/v1/subscriptions', subscription)
    await global.ax.user1.post('/api/v1/subscriptions', subscription)
    await global.ax.user2.post('/api/v1/subscriptions', subscription)
    let res = await global.ax.admin1.get('/api/v1/subscriptions')
    assert.equal(res.data.count, 1)

    res = await global.ax.push.post('/api/v1/notifications', {
      topic: { key: 'topic1' },
      title: 'a notification',
      sender: { type: 'user', id: 'user1' },
      visibility: 'public'
    })
    res = await global.ax.admin1.get('/api/v1/notifications')
    assert.equal(res.data.count, 1)
    res = await global.ax.user1.get('/api/v1/notifications')
    assert.equal(res.data.count, 1)
    res = await global.ax.user2.get('/api/v1/notifications')
    assert.equal(res.data.count, 1)
  })

  it('should send a private notification only to member of sender organization', async () => {
    const subscription = {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga1' }
    }
    let res = await global.ax.admin1.post('/api/v1/subscriptions', subscription)
    assert.equal(res.data.visibility, 'private')
    res = await global.ax.user1.post('/api/v1/subscriptions', subscription)
    assert.equal(res.data.visibility, 'private')
    res = await global.ax.user2.post('/api/v1/subscriptions', subscription)
    assert.equal(res.data.visibility, 'public')

    res = await global.ax.push.post('/api/v1/notifications', {
      topic: { key: 'topic1' },
      title: 'a notification',
      sender: { type: 'organization', id: 'orga1' }
    })
    res = await global.ax.admin1.get('/api/v1/notifications')
    assert.equal(res.data.count, 1)
    res = await global.ax.user1.get('/api/v1/notifications')
    assert.equal(res.data.count, 1)
    res = await global.ax.user2.get('/api/v1/notifications')
    assert.equal(res.data.count, 0)
  })

  it('should send a private notification only to member of sender organization with certain role', async () => {
    const subscription = {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga1', role: 'admin' }
    }
    let res = await global.ax.admin1.post('/api/v1/subscriptions', subscription)
    assert.equal(res.data.visibility, 'private')
    res = await global.ax.user1.post('/api/v1/subscriptions', subscription)
    assert.equal(res.data.visibility, 'public')

    res = await global.ax.push.post('/api/v1/notifications', {
      topic: { key: 'topic1' },
      title: 'a notification',
      sender: { type: 'organization', id: 'orga1', role: 'admin' }
    })
    res = await global.ax.admin1.get('/api/v1/notifications')
    assert.equal(res.data.count, 1)
    res = await global.ax.user1.get('/api/v1/notifications')
    assert.equal(res.data.count, 0)
  })

  it('should not send a global private notification to member of a department in sender organization', async () => {
    const subscription = {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga2' }
    }
    let res = await global.ax.user2.post('/api/v1/subscriptions', subscription)
    // user2 is in a department, he only as access to public notification on the root of the org
    assert.equal(res.data.visibility, 'public')

    res = await global.ax.push.post('/api/v1/notifications', {
      topic: { key: 'topic1' },
      title: 'a notification',
      sender: { type: 'organization', id: 'orga2' }
    })
    res = await global.ax.user2.get('/api/v1/notifications')
    assert.equal(res.data.count, 0)
  })

  it('should send a notifications to any department', async () => {
    let res = await global.ax.user1.post('/api/v1/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga2', department: 'dep1' }
    })
    assert.equal(res.data.visibility, 'private')
    res = await global.ax.user2.post('/api/v1/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga2', department: 'dep2' }
    })
    assert.equal(res.data.visibility, 'private')

    res = await global.ax.push.post('/api/v1/notifications', {
      topic: { key: 'topic1' },
      title: 'a notification',
      sender: { type: 'organization', id: 'orga2', department: '*' }
    })
    res = await global.ax.user2.get('/api/v1/notifications')
    assert.equal(res.data.count, 1)
    res = await global.ax.user1.get('/api/v1/notifications')
    assert.equal(res.data.count, 1)
  })

  it('should send a private department notification to member of right department in sender organization', async () => {
    let res = await global.ax.user1.post('/api/v1/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga2', department: 'dep2' }
    })
    assert.equal(res.data.visibility, 'public')
    res = await global.ax.user2.post('/api/v1/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga2', department: 'dep2' }
    })
    assert.equal(res.data.visibility, 'private')

    res = await global.ax.push.post('/api/v1/notifications', {
      topic: { key: 'topic1' },
      title: 'a notification',
      sender: { type: 'organization', id: 'orga2', department: 'dep2' }
    })
    res = await global.ax.user2.get('/api/v1/notifications')
    assert.equal(res.data.count, 1)
    res = await global.ax.user1.get('/api/v1/notifications')
    assert.equal(res.data.count, 0)
  })
})
