const { test, describe, after, beforeEach, before } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const User = require('../models/user')
const bcrypt = require('bcrypt')

require('dotenv').config()

const api = supertest(app)

describe('Login', () => {
    before(async () => {
        await mongoose.connect(process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1/bloglist-test')
    })

    beforeEach(async () => {
        await User.deleteMany({})
        const passwordHash = await bcrypt.hash('secret', 10)
        const user = new User({ username: 'login_root', passwordHash })
        await user.save()
    })

    test('succeeds with correct credentials', async () => {
        const result = await api
            .post('/api/login')
            .send({
                username: 'login_root',
                password: 'secret',
            })
            .expect(200)
            .expect('Content-Type', /application\/json/)

        assert.ok(result.body.token)
        assert.strictEqual(result.body.username, 'login_root')
    })

    test('fails with wrong password', async () => {
        const result = await api
            .post('/api/login')
            .send({
                username: 'login_root',
                password: 'wrongpassword',
            })
            .expect(401)
            .expect('Content-Type', /application\/json/)

        assert.strictEqual(result.body.error, 'invalid username or password')
    })

    after(async () => {
        await mongoose.connection.close()
    })
})
