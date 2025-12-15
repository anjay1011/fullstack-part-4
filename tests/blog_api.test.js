const { describe, test, before, beforeEach, after } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const Blog = require('../models/blog')
const User = require('../models/user')
const helper = require('./test_helper')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
require('dotenv').config()

const api = supertest(app)

let token = null

before(async () => {
  const uri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1/bloglist-test'
  await mongoose.connect(uri)
})

beforeEach(async () => {
  await Blog.deleteMany({})
  await Blog.insertMany(helper.initialBlogs)
  await User.deleteMany({})

  const passwordHash = await bcrypt.hash('secret', 10)
  const user = new User({ username: 'root', passwordHash })
  await user.save()

  const userForToken = {
    username: user.username,
    id: user._id,
  }

  // Provide a valid secret for testing even if env is missing
  token = jwt.sign(userForToken, process.env.SECRET || 'secret')
})

after(async () => {
  await mongoose.connection.close()
})

describe('blog api', () => {
  test('returns blogs as json with correct length', async () => {
    const response = await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)

    assert.strictEqual(response.body.length, helper.initialBlogs.length)
  })

  test('unique identifier property is named id', async () => {
    const response = await api.get('/api/blogs')
    const blog = response.body[0]

    assert.ok(blog.id)
    assert.strictEqual(blog._id, undefined)
  })

  test('successfully creates a new blog post', async () => {
    const newBlog = {
      title: 'Testing creates new entries',
      author: 'Test Author',
      url: 'https://testing.example.com',
      likes: 4,
    }

    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .send(newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const blogsAtEnd = await helper.blogsInDb()
    assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1)

    const titles = blogsAtEnd.map((blog) => blog.title)
    assert.ok(titles.includes(newBlog.title))
  })

  test('defaults likes to zero if missing from request', async () => {
    const newBlog = {
      title: 'Likes default behaviour',
      author: 'No Likes Author',
      url: 'https://nolikes.example.com',
    }

    const response = await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .send(newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    assert.strictEqual(response.body.likes, 0)
  })

  test('fails with status 400 if title is missing', async () => {
    const newBlog = {
      author: 'Missing Title Author',
      url: 'https://missingtitle.example.com',
    }

    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .send(newBlog)
      .expect(400)

    const blogsAtEnd = await helper.blogsInDb()
    assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
  })

  test('fails with status 400 if url is missing', async () => {
    const newBlog = {
      title: 'Missing URL',
      author: 'Missing URL Author',
    }

    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .send(newBlog)
      .expect(400)

    const blogsAtEnd = await helper.blogsInDb()
    assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
  })

  test('fails with status 401 if token is missing', async () => {
    const newBlog = {
      title: 'No Token Blog',
      author: 'Hacker',
      url: 'https://hacker.com'
    }

    await api
      .post('/api/blogs')
      .send(newBlog)
      .expect(401)
  })

  test('deletes a blog', async () => {
    const blogsAtStart = await helper.blogsInDb()
    const blogToDelete = blogsAtStart[0]

    await api.delete(`/api/blogs/${blogToDelete.id}`).expect(204)

    const blogsAtEnd = await helper.blogsInDb()
    assert.strictEqual(blogsAtEnd.length, blogsAtStart.length - 1)
    const ids = blogsAtEnd.map((blog) => blog.id)
    assert.ok(!ids.includes(blogToDelete.id))
  })

  test('updates likes of a blog', async () => {
    const blogsAtStart = await helper.blogsInDb()
    const blogToUpdate = blogsAtStart[0]

    const updatedLikes = blogToUpdate.likes + 10

    const response = await api
      .put(`/api/blogs/${blogToUpdate.id}`)
      .send({ likes: updatedLikes })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    assert.strictEqual(response.body.likes, updatedLikes)

    const blogsAtEnd = await helper.blogsInDb()
    const updatedBlog = blogsAtEnd.find((blog) => blog.id === blogToUpdate.id)
    assert.strictEqual(updatedBlog.likes, updatedLikes)
  })
})
