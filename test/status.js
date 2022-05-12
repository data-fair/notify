const assert = require('assert').strict

describe('status', () => {
  it('Get status', async () => {
    const res = await global.ax.admin1.get('/api/v1/status')
    assert.equal(res.status, 200)
    assert.equal(res.data.status, 'ok')
    assert.equal(res.data.details.length, 1)
  })

  it('Ping service', async () => {
    const res = await global.ax.ano.get('/api/v1/ping')
    assert.equal(res.status, 200)
    assert.equal(res.data, 'ok')
  })
})
