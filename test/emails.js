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

  it('should send a digest', async () => {
    await global.ax.push.post('/api/v1/notifications', {
      topic: { key: 'topic1', title: 'Topic 1' },
      title: 'a notification',
      recipient: { id: 'user1' },
      outputs: ['digest']
    })
    await global.ax.push.post('/api/v1/notifications', {
      topic: { key: 'topic1', title: 'Topic 1' },
      title: 'another notification',
      recipient: { id: 'user1' },
      outputs: ['digest']
    })
    await global.ax.push.post('/api/v1/notifications', {
      topic: { key: 'topic2', title: 'Topic 2' },
      title: 'another notification from another topic',
      recipient: { id: 'user1' },
      outputs: ['digest']
    })
    // wait for digests cron job
    await new Promise(resolve => setTimeout(resolve, 1000))
    const mails = await getMails()
    assert.equal(mails.length, 1)
    assert.ok(mails[0].subject.startsWith('résumé de l\'activité semaine '))
    assert.equal(mails[0].text, 'Topic 1 : 2 évènements\n----------\nanother notification from another topic')
    assert.equal(mails[0].html, '<h2>Topic 1 : 2 évènements</h2><hr><h2>another notification from another topic</h2><p></p>')
  })
})
