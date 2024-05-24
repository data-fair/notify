const assert = require('assert').strict

const getMails = async () => {
  // see https://github.com/maildev/maildev/blob/master/docs/rest.md
  const res = await global.ax.admin1.get('http://localhost:1080/email')
  await global.ax.admin1.delete('http://localhost:1080/email/all')
  return res.data
}

describe('Email output', () => {
  it('should send a single notification by mail', async () => {
    await global.ax.push.post('/api/v1/notifications', {
      topic: { key: 'topic1' },
      title: 'a notification',
      recipient: { id: 'user1' },
      outputs: ['email']
    })
    // wait for emailsGrouping cron job
    await new Promise(resolve => setTimeout(resolve, 1000))
    const mails = await getMails()
    assert.equal(mails.length, 1)
    assert.equal(mails[0].subject, 'a notification')
  })

  it('should send grouped notifications by mail', async () => {
    await global.ax.push.post('/api/v1/notifications', {
      topic: { key: 'topic1' },
      title: 'a notification',
      recipient: { id: 'user1' },
      outputs: ['email']
    })
    await global.ax.push.post('/api/v1/notifications', {
      topic: { key: 'topic1' },
      title: 'another notification with a very long title that should be truncated',
      recipient: { id: 'user1' },
      outputs: ['email']
    })
    // wait for emailsGrouping cron job
    await new Promise(resolve => setTimeout(resolve, 1000))
    const mails = await getMails()
    assert.equal(mails.length, 1)
    assert.equal(mails[0].subject, 'a notification, another notification with a very long title that should be trunc...')
  })
})
