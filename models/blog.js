const mongoose = require('mongoose')

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  author: String,
  comments: [
    {
      text: String,
      username: String, // Store username for easier display
      date: { type: Date, default: Date.now }
    }
  ],
  likes: {
    type: Number,
    default: 0,
  },
  isAnonymous: {
    type: Boolean,
    default: false,
  },
  likedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
})

blogSchema.set('toJSON', {
  transform: (_document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  },
}, { timestamps: true })

module.exports = mongoose.model('Blog', blogSchema)