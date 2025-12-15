const { test, describe, after, beforeEach, before } = require('node:test')
require('dotenv').config()
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const User = require('../models/user')

const api = supertest(app)

describe('User creation', () => {
    before(async () => {
        await mongoose.connect(process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1/bloglist-test')
    })

    beforeEach(async () => {
        await User.deleteMany({})
    })

    test('creation succeeds with a fresh username', async () => {
        const usersAtStart = await User.find({})

        const newUser = {
            username: 'root',
            name: 'Superuser',
            password: 'statelove',
        }

        await api
            .post('/api/users')
            .send(newUser)
            .expect(201)
            .expect('Content-Type', /application\/json/)

        const usersAtEnd = await User.find({})
        assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1)

        const usernames = usersAtEnd.map(u => u.username)
        assert(usernames.includes(newUser.username))
    })

    test('creation fails with proper statuscode and message if password is too short', async () => {
        const usersAtStart = await User.find({})

        const newUser = {
            username: 'mooc',
            name: 'Mooc User',
            password: 'lo',
        }

        const result = await api
            .post('/api/users')
            .send(newUser)
            .expect(400)
            .expect('Content-Type', /application\/json/)

        assert(result.body.error.includes('password must be at least 3 characters long'))

        const usersAtEnd = await User.find({})
        assert.strictEqual(usersAtEnd.length, usersAtStart.length)
    })

    test('creation fails with proper statuscode if username is too short', async () => {
        const usersAtStart = await User.find({})

        const newUser = {
            username: 'mu',
            name: 'User with short username',
            password: 'secretpassword',
        }

        const result = await api
            .post('/api/users')
            .send(newUser)
            .expect(400)
            .expect('Content-Type', /application\/json/)

        assert(result.body.error.includes('is shorter than the minimum allowed length'))

        const usersAtEnd = await User.find({})
        assert.strictEqual(usersAtEnd.length, usersAtStart.length)
    })

    test('creation fails with proper statuscode if username is missing', async () => {
        const usersAtStart = await User.find({})

        const newUser = {
            name: 'User without username',
            password: 'secretpassword',
        }

        const result = await api
            .post('/api/users')
            .send(newUser)
            .expect(400)
            .expect('Content-Type', /application\/json/)

        assert(result.body.error.includes('`username` is required'))

        const usersAtEnd = await User.find({})
        assert.strictEqual(usersAtEnd.length, usersAtStart.length)
    })

    after(async () => {
        await mongoose.connection.close()
    })
})
