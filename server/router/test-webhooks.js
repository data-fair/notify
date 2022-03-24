const express = require('express')

const router = module.exports = express.Router()

router.post('/ok', (req, res, next) => {
  console.log('ok webhook', req.body, req.headers)
  res.send('ok')
})

router.post('/ko', (req, res, next) => {
  console.log('ko webhook', req.body, req.headers)
  res.status(500).send('ko')
})
