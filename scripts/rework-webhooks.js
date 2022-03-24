
const main = async () => {
  const { db } = await require('../server/utils/db').connect()
  console.log(await db.collection('webhooks').updateMany({ status: 'working' }, { $set: { status: 'waiting' } }))
}

main()
  .then(() => process.exit())
  .catch((err) => {
    console.error(err)
    process.exit(-1)
  })
