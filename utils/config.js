require('dotenv').config()

const { NODE_ENV, PORT: PORT_ENV, MONGODB_URI: MONGODB_URI_ENV, TEST_MONGODB_URI } = process.env

const PORT = PORT_ENV || 3003
const MONGODB_URI = TEST_MONGODB_URI || MONGODB_URI_ENV || 'mongodb://127.0.0.1/bloglist'

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined. Set it in the environment or .env file.')
}

module.exports = {
  PORT,
  MONGODB_URI,
}