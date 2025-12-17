const jwt = require('jsonwebtoken')
const blogsRouter = require('express').Router()
const Blog = require('../models/blog')
const User = require('../models/user')

blogsRouter.get('/', async (request, response, next) => {
  try {
    const blogs = await Blog.find({}).populate('user', { username: 1, name: 1 })
    response.json(blogs)
  } catch (error) {
    next(error)
  }
})

blogsRouter.post('/', async (request, response, next) => {
  const body = request.body

  const decodedToken = jwt.verify(request.token, process.env.SECRET)
  if (!decodedToken.id) {
    return response.status(401).json({ error: 'token missing or invalid' })
  }
  const user = await User.findById(decodedToken.id)

  const blog = new Blog({
    title: body.title,
    author: body.isAnonymous ? 'Anonymous' : body.author,
    likes: body.likes || 0,
    isAnonymous: body.isAnonymous || false,
    user: user._id
  })

  try {
    const savedBlog = await blog.save()
    user.blogs = user.blogs.concat(savedBlog._id)
    await user.save()
    response.status(201).json(savedBlog)
  } catch (error) {
    next(error)
  }
})

blogsRouter.delete('/:id', async (request, response, next) => {
  try {
    const deletedBlog = await Blog.findByIdAndDelete(request.params.id)

    if (!deletedBlog) {
      return response.status(404).end()
    }

    response.status(204).end()
  } catch (error) {
    next(error)
  }
})

blogsRouter.put('/:id', async (request, response, next) => {
  try {
    const updates = request.body

    const updatedBlog = await Blog.findByIdAndUpdate(request.params.id, updates, {
      new: true,
      runValidators: true,
      context: 'query',
    })

    if (!updatedBlog) {
      return response.status(404).end()
    }

    response.json(updatedBlog)
  } catch (error) {
    next(error)
  }
})

blogsRouter.put('/:id/like', async (request, response, next) => {
  try {
    const decodedToken = jwt.verify(request.token, process.env.SECRET)
    if (!decodedToken.id) {
      return response.status(401).json({ error: 'token missing or invalid' })
    }

    const blog = await Blog.findById(request.params.id)
    if (!blog) {
      return response.status(404).end()
    }

    const userId = decodedToken.id
    const userAlreadyLiked = blog.likedBy.includes(userId)

    let updatedData
    if (userAlreadyLiked) {
      // Unlike
      updatedData = {
        $pull: { likedBy: userId },
        $inc: { likes: -1 }
      }
    } else {
      // Like
      updatedData = {
        $addToSet: { likedBy: userId },
        $inc: { likes: 1 }
      }
    }

    const updatedBlog = await Blog.findByIdAndUpdate(request.params.id, updatedData, {
      new: true,
    }).populate('user', { username: 1, name: 1 })

    response.json(updatedBlog)
  } catch (error) {
    next(error)
  }
})

blogsRouter.post('/:id/comments', async (request, response, next) => {
  try {
    const { text } = request.body
    if (!text) {
      return response.status(400).json({ error: 'comment text missing' })
    }

    // We can allow anonymous comments or require user.
    // Let's assume we want to track who commented if they are logged in.
    // If we want to support anonymous comments purely, we might not verify token.
    // But user asked "if it is anonymous, share it Anonymous, or username should be compulsarily shown".
    // This implies we should try to get the user.

    let username = 'Anonymous'
    try {
      const decodedToken = jwt.verify(request.token, process.env.SECRET)
      if (decodedToken.id) {
        const user = await User.findById(decodedToken.id)
        if (user) {
          username = user.username
        }
      }
    } catch (e) {
      // Token invalid or missing, proceed as Anonymous
    }

    const blog = await Blog.findById(request.params.id)
    if (!blog) {
      return response.status(404).end()
    }

    const comment = {
      text,
      username,
      date: new Date()
    }

    blog.comments = blog.comments.concat(comment)
    const savedBlog = await blog.save()

    // We might want to populate user for the returned blog if needed, but comments are subdocs now.
    // Just return the updated blog.
    response.status(201).json(savedBlog)

  } catch (error) {
    next(error)
  }
})

module.exports = blogsRouter