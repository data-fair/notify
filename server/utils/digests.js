const config = require('config')
const dayjs = require('dayjs')
const weekOfYear = require('dayjs/plugin/weekOfYear')
dayjs.extend(weekOfYear)
const debug = require('debug')('digests')
const { i18n } = require('./i18n')
const { getNotifMailBody, sendMail } = require('./emails')

exports.sendLastWeekDigest = async (db) => {
  const oneWeekAgo = process.env.NODE_ENV === 'test' ? dayjs() : dayjs().subtract(1, 'week')
  const startOfWeek = oneWeekAgo.startOf('week')
  const endOfWeek = oneWeekAgo.endOf('week')
  await exports.sendDigest(db, i18n.__('weeklyDigest', { week: oneWeekAgo.week() }), startOfWeek, endOfWeek)
}

exports.sendDigest = async (db, title, start, end) => {
  debug(`${title} from ${start.format()} to ${end.format()}`)
  const dateFilter = { $gte: start.toISOString(), $lt: end.toISOString() }
  const cursor = db.collection('notifications').aggregate([
    { $match: { date: dateFilter, outputs: 'digest' } },
    { $group: { _id: { user: '$recipient.id', topic: '$topic.key' }, key: { $first: '$topic.key' }, title: { $first: '$topic.title' }, count: { $sum: 1 } } },
    { $group: { _id: '$_id.user', topics: { $push: '$$ROOT' } } }
  ])
  for await (const digestData of cursor) {
    const sections = []
    const detailedTopics = []
    for (const topic of digestData.topics) {
      topic.title = topic.title || topic.key
      if (topic.count > config.digest.maxItems) {
        sections.push({
          text: i18n.__('topicCount', topic),
          html: '<h2>' + i18n.__('topicCount', topic) + '</h2>'
        })
      } else {
        detailedTopics.push(topic)
      }
    }
    for (const topic of detailedTopics) {
      const cursor = db.collection('notifications').find({
        'recipient.id': digestData._id,
        'topic.key': topic.key,
        date: dateFilter
      })
      for await (const notification of cursor) {
        sections.push(getNotifMailBody(notification, true))
      }
    }

    const mail = {
      to: [{ type: 'user', id: digestData._id }],
      subject: title,
      text: sections.map(s => s.text).join('\n----------\n'),
      html: sections.map(s => s.html).join('<hr>')
    }
    await sendMail(mail)
  }
}
