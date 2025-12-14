const mongoose = require('mongoose')
const app = require('./app')
const config = require('./utils/config')
const logger = require('./utils/logger')

const startServer = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI, { family: 4 })
    logger.info('Connected to MongoDB')

    app.listen(config.PORT, () => {
      logger.info(`Server running on port ${config.PORT}`)
    })
  } catch (error) {
    logger.error('Error connecting to MongoDB:', error.message)
  }
}

startServer()