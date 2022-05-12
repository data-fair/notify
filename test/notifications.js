const assert = require('assert').strict

describe('Notifications', () => {
  it('should reject wrong secret  key', async () => {
    await assert.rejects(global.ax.ano.post('/api/v1/notifications', { params: { key: 'badkey' } }), (err) => {
      assert.equal(err.status, 401)
      return true
    })
  })

  it('should reject anonymous user', async () => {
    await assert.rejects(global.ax.ano.get('/api/v1/notifications'), (err) => {
      assert.equal(err.status, 401)
      return true
    })
  })

  it.only('should send a notification straight to a user', async () => {
    let res = await global.ax.push.post('/api/v1/notifications', {
      topic: { key: 'topic' },
      title: 'a notification',
      recipient: { id: 'user1' }
    })
    assert.ok(res.data.date)
    res = await global.ax.admin1.get('/api/v1/notifications')
    assert.equal(res.data.count, 0)
    res = await global.ax.user1.get('/api/v1/notifications')
    assert.equal(res.data.count, 1)
  })
})
