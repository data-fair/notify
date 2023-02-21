// A middleware that uses SD session info or creates a pseudo user based on api key
// also prepare req.user.accountOwner

const asyncWrap = require('./async-wrap')

module.exports = (required = true) => asyncWrap(async (req, res, next) => {
  await req.app.get('session').auth(req, res, () => {})
  if (!req.user) {
    if (required) return res.status(401).send()
    next()
  }
  next()
})
